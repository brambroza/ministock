import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).optional()
});

export async function POST(req: NextRequest) {
  try {
    const payload = schema.parse(await req.json());

    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    const existed = existingAuth.users.some((u) => (u.email ?? "").toLowerCase() === payload.email.toLowerCase());
    if (existed) {
      return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 400 });
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        display_name: payload.display_name ?? payload.email
      }
    });

    if (createErr || !created.user?.id) {
      return NextResponse.json({ error: createErr?.message ?? "สร้างบัญชีไม่สำเร็จ" }, { status: 400 });
    }

    const { data: defaultCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!defaultCompany?.id) {
      return NextResponse.json({ error: "ไม่พบบริษัทเริ่มต้นในระบบ" }, { status: 400 });
    }

    const { data: viewerRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("company_id", defaultCompany.id)
      .eq("role_code", "VIEWER")
      .limit(1)
      .maybeSingle();

    if (!viewerRole?.id) {
      return NextResponse.json({ error: "ไม่พบบทบาท VIEWER ในบริษัทเริ่มต้น" }, { status: 400 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        company_id: defaultCompany.id,
        auth_user_id: created.user.id,
        display_name: payload.display_name ?? payload.email,
        email: payload.email,
        role_id: viewerRole.id,
        active: true
      })
      .select("id")
      .single();

    if (profileErr || !profile?.id) {
      return NextResponse.json({ error: profileErr?.message ?? "สร้างโปรไฟล์ไม่สำเร็จ" }, { status: 400 });
    }

    await supabaseAdmin.from("company_users").insert({
      company_id: defaultCompany.id,
      user_profile_id: profile.id,
      invite_status: "ACCEPTED",
      active: true
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
