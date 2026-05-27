import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLiffSessionCookie, LIFF_SESSION_COOKIE, LIFF_SESSION_MAX_AGE } from "@/lib/auth/liff-session";

const schema = z.object({
  line_user_id: z.string().min(1),
  line_display_name: z.string().optional(),
  line_picture_url: z.string().url().nullable().optional(),
  id_token: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    if (body.id_token) {
      const clientId = process.env.LINE_AUTH_CHANNEL_ID ?? process.env.LINE_CHANNEL_ID ?? "";
      if (clientId) {
        const params = new URLSearchParams({ id_token: body.id_token, client_id: clientId });
        const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: params.toString(),
          cache: "no-store"
        });

        if (!verifyRes.ok) {
          return NextResponse.json({ error: "LINE token ไม่ถูกต้อง" }, { status: 401 });
        }
      }
    }

    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id,company_id,line_user_id,active,is_deleted")
      .eq("line_user_id", body.line_user_id)
      .eq("active", true)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!profile) return NextResponse.json({ error: "unlinked" }, { status: 403 });

    await supabaseAdmin
      .from("user_profiles")
      .update({
        line_display_name: body.line_display_name,
        line_picture_url: body.line_picture_url ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.id);

    const token = createLiffSessionCookie({
      profile_id: profile.id,
      company_id: profile.company_id,
      line_user_id: profile.line_user_id
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(LIFF_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: LIFF_SESSION_MAX_AGE,
      path: "/"
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
