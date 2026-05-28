import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const createSchema = z.object({
  role_code: z.enum(["COMPANY_ADMIN", "MANAGER", "STAFF", "VIEWER"]).default("STAFF"),
  expire_days: z.number().int().min(1).max(30).default(7),
  max_uses: z.number().int().min(1).max(1000).default(100),
  note: z.string().max(255).optional()
});

function getLineLinks() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const oaId = process.env.NEXT_PUBLIC_LINE_OA_ID ?? "";
  const encodedOaId = oaId ? encodeURIComponent(oaId) : "";

  return {
    line_login_url: `${appUrl}/api/auth/line/login`,
    line_add_friend_url: process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || (oaId ? `https://line.me/R/ti/p/${oaId}` : ""),
    line_msgapi_url: process.env.NEXT_PUBLIC_LINE_MSGAPI_URL || (oaId ? `https://line.me/R/oaMessage/${encodedOaId}` : ""),
    liff_dashboard_url: `${appUrl}/liff/dashboard`
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id,company_id")
    .eq("auth_user_id", auth.user.id)
    .eq("is_deleted", false)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: "ไม่พบบริษัทผู้ใช้งาน" }, { status: 400 });

  const { data: links } = await supabase
    .from("company_invite_links")
    .select("id, note, max_uses, used_count, expires_at, active, created_at")
    .eq("company_id", profile.company_id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ items: links ?? [], line_links: getLineLinks() });
}

export async function POST(req: NextRequest) {
  try {
    const payload = createSchema.parse(await req.json());
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id,company_id,role_id")
      .eq("auth_user_id", auth.user.id)
      .eq("is_deleted", false)
      .single();

    if (!profile?.id || !profile.company_id) {
      return NextResponse.json({ error: "ไม่พบโปรไฟล์ผู้ใช้งาน" }, { status: 400 });
    }

    const { data: myRole } = await supabase
      .from("roles")
      .select("role_code")
      .eq("id", profile.role_id)
      .maybeSingle();
    const roleCode = String(myRole?.role_code ?? "VIEWER").toUpperCase();
    if (!["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(roleCode)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างลิงก์เชิญ" }, { status: 403 });
    }

    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("role_code", payload.role_code)
      .single();

    if (!role?.id) return NextResponse.json({ error: "ไม่พบบทบาทที่ต้องการ" }, { status: 400 });

    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + payload.expire_days * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error } = await supabaseAdmin
      .from("company_invite_links")
      .insert({
        company_id: profile.company_id,
        role_id: role.id,
        token_hash: tokenHash,
        note: payload.note ?? null,
        max_uses: payload.max_uses,
        used_count: 0,
        expires_at: expiresAt,
        active: true,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      return NextResponse.json({ error: error?.message ?? "สร้างลิงก์ไม่สำเร็จ" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const joinUrl = `${appUrl}/join/${token}`;
    const lineLoginJoinUrl = `${appUrl}/api/auth/line/login?next=${encodeURIComponent(`/join/${token}`)}`;

    return NextResponse.json({
      ok: true,
      item: { id: inserted.id, expires_at: expiresAt, max_uses: payload.max_uses },
      links: {
        join_url: joinUrl,
        line_login_join_url: lineLoginJoinUrl,
        ...getLineLinks()
      }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
