import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LineTokenResponse = {
  access_token: string;
  id_token?: string;
};

type LineProfileResponse = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type ResolvedProfile = {
  id: string;
  auth_user_id: string;
  email: string | null;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const channelId = process.env.LINE_AUTH_CHANNEL_ID ?? process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_AUTH_CHANNEL_SECRET ?? process.env.LINE_CHANNEL_SECRET;

  if (!appUrl || !channelId || !channelSecret) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=config`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get("line_oauth_state")?.value;
  const nextAfterLogin = req.cookies.get("line_oauth_next")?.value || "/portal/dashboard";

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=invalid_state`);
  }

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl}/api/auth/line/callback`,
      client_id: channelId,
      client_secret: channelSecret
    })
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=line_token`);
  }

  const tokenData = (await tokenRes.json()) as LineTokenResponse;
  const accessToken = tokenData.access_token;

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=line_profile`);
  }

  const lineProfile = (await profileRes.json()) as LineProfileResponse;
  const jwtPayload = tokenData.id_token ? decodeJwtPayload(tokenData.id_token) : null;
  const lineEmail = typeof jwtPayload?.email === "string" ? jwtPayload.email : null;

  const { data: profileByLine } = await supabaseAdmin
    .from("user_profiles")
    .select("id, auth_user_id, email")
    .eq("line_user_id", lineProfile.userId)
    .eq("active", true)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  let resolvedProfile: ResolvedProfile | null = profileByLine;

  // First-time LINE login: auto-link with existing account by email (if found)
  if (!resolvedProfile?.auth_user_id && lineEmail) {
    const { data: profileByEmail } = await supabaseAdmin
      .from("user_profiles")
      .select("id, auth_user_id, email")
      .ilike("email", lineEmail)
      .eq("active", true)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (profileByEmail?.auth_user_id) {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          line_user_id: lineProfile.userId,
          line_display_name: lineProfile.displayName,
          line_picture_url: lineProfile.pictureUrl ?? null
        })
        .eq("id", profileByEmail.id);

      resolvedProfile = profileByEmail;
    }
  }

  // If still unlinked, auto-provision account and bind to default company as VIEWER
  if (!resolvedProfile?.auth_user_id) {
    const fallbackEmail = `line_${lineProfile.userId.toLowerCase()}@line.local`;
    const createEmail = lineEmail ?? fallbackEmail;

    const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: createEmail,
      email_confirm: true,
      user_metadata: {
        display_name: lineProfile.displayName,
        provider: "line"
      }
    });

    if (createAuthError || !newAuthUser.user?.id) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?error=provision_auth`);
    }

    const { data: defaultCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!defaultCompany?.id) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?error=no_company`);
    }

    const { data: viewerRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("company_id", defaultCompany.id)
      .eq("role_code", "VIEWER")
      .limit(1)
      .maybeSingle();

    if (!viewerRole?.id) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?error=no_viewer_role`);
    }

    const { data: newProfile, error: createProfileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        company_id: defaultCompany.id,
        auth_user_id: newAuthUser.user.id,
        line_user_id: lineProfile.userId,
        line_display_name: lineProfile.displayName,
        line_picture_url: lineProfile.pictureUrl ?? null,
        display_name: lineProfile.displayName,
        email: createEmail,
        role_id: viewerRole.id,
        active: true
      })
      .select("id, auth_user_id, email")
      .single();

    if (createProfileError || !newProfile) {
      return NextResponse.redirect(`${req.nextUrl.origin}/login?error=provision_profile`);
    }

    await supabaseAdmin.from("company_users").insert({
      company_id: defaultCompany.id,
      user_profile_id: newProfile.id,
      invite_status: "ACCEPTED",
      active: true
    });

    resolvedProfile = newProfile;
  }

  await supabaseAdmin
    .from("user_profiles")
    .update({
      line_user_id: lineProfile.userId,
      line_display_name: lineProfile.displayName,
      line_picture_url: lineProfile.pictureUrl ?? null,
      email: resolvedProfile.email ?? lineEmail
    })
    .eq("id", resolvedProfile.id);

  const { data: authUserResult } = await supabaseAdmin.auth.admin.getUserById(resolvedProfile.auth_user_id);
  const targetEmail = authUserResult.user?.email ?? resolvedProfile.email ?? lineEmail;

  if (!targetEmail) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=no_email`);
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
    options: {
      redirectTo: `${appUrl}/auth/complete?next=${encodeURIComponent(nextAfterLogin)}`
    }
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=magic_link`);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(linkData.properties.action_link);
  response.cookies.set("line_oauth_state", "", { path: "/", maxAge: 0 });
  response.cookies.set("line_oauth_nonce", "", { path: "/", maxAge: 0 });
  response.cookies.set("line_oauth_next", "", { path: "/", maxAge: 0 });
  return response;
}
