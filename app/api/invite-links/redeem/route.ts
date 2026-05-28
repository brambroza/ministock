import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({ token: z.string().min(16) });

export async function POST(req: NextRequest) {
  try {
    const { token } = schema.parse(await req.json());
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { data: invite } = await supabaseAdmin
      .from("company_invite_links")
      .select("id, company_id, role_id, expires_at, max_uses, used_count, active, is_deleted")
      .eq("token_hash", tokenHash)
      .eq("is_deleted", false)
      .single();

    if (!invite?.id) return NextResponse.json({ error: "ลิงก์เชิญไม่ถูกต้อง" }, { status: 404 });
    if (!invite.active) return NextResponse.json({ error: "ลิงก์เชิญถูกปิดใช้งาน" }, { status: 400 });
    if (new Date(invite.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "ลิงก์เชิญหมดอายุแล้ว" }, { status: 400 });
    if ((invite.used_count ?? 0) >= (invite.max_uses ?? 0)) return NextResponse.json({ error: "ลิงก์เชิญถูกใช้งานครบจำนวนแล้ว" }, { status: 400 });

    const { data: existingProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, company_id")
      .eq("auth_user_id", auth.user.id)
      .eq("is_deleted", false)
      .maybeSingle();

    let profileId = existingProfile?.id as string | undefined;
    if (!existingProfile?.id) {
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          company_id: invite.company_id,
          auth_user_id: auth.user.id,
          display_name: auth.user.user_metadata?.display_name ?? auth.user.email ?? "ผู้ใช้งาน",
          email: auth.user.email ?? null,
          role_id: invite.role_id,
          active: true
        })
        .select("id")
        .single();

      if (createProfileError || !newProfile?.id) {
        return NextResponse.json({ error: createProfileError?.message ?? "สร้างโปรไฟล์ไม่สำเร็จ" }, { status: 400 });
      }
      profileId = newProfile.id;
    } else {
      const { error: updateErr } = await supabaseAdmin
        .from("user_profiles")
        .update({
          company_id: invite.company_id,
          role_id: invite.role_id,
          email: auth.user.email ?? null,
          active: true
        })
        .eq("id", existingProfile.id);

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    if (!profileId) return NextResponse.json({ error: "ไม่พบโปรไฟล์ผู้ใช้" }, { status: 400 });

    await supabaseAdmin.from("company_users").upsert({
      company_id: invite.company_id,
      user_profile_id: profileId,
      invite_status: "ACCEPTED",
      active: true
    }, { onConflict: "company_id,user_profile_id" });

    await supabaseAdmin
      .from("company_invite_links")
      .update({ used_count: (invite.used_count ?? 0) + 1 })
      .eq("id", invite.id);

    await supabaseAdmin.from("audit_logs").insert({
      company_id: invite.company_id,
      action: "INVITE_ACCEPT",
      table_name: "company_invite_links",
      record_id: invite.id,
      new_data: { auth_user_id: auth.user.id, profile_id: profileId },
      created_by: profileId,
      updated_by: profileId
    });

    return NextResponse.json({ ok: true, company_id: invite.company_id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
