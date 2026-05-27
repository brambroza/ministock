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

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, auth_user_id, email")
    .eq("line_user_id", lineProfile.userId)
    .eq("active", true)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  if (!profile?.auth_user_id) {
    return NextResponse.redirect(`${req.nextUrl.origin}/liff/request-access`);
  }

  await supabaseAdmin
    .from("user_profiles")
    .update({
      line_display_name: lineProfile.displayName,
      line_picture_url: lineProfile.pictureUrl ?? null,
      email: profile.email ?? lineEmail
    })
    .eq("id", profile.id);

  const { data: authUserResult } = await supabaseAdmin.auth.admin.getUserById(profile.auth_user_id);
  const targetEmail = authUserResult.user?.email ?? profile.email ?? lineEmail;

  if (!targetEmail) {
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=no_email`);
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
    options: {
      redirectTo: `${appUrl}/portal/dashboard`
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
  return response;
}
