import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LIFF_SESSION_COOKIE, parseLiffSessionCookie } from "@/lib/auth/liff-session";

export type AppActor = {
  profileId: string;
  companyId: string;
  authUserId: string | null;
  roleCode: string;
  source: "supabase" | "liff";
};

export async function getCurrentActor(): Promise<AppActor | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id,company_id,auth_user_id,roles(role_code)")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .eq("is_deleted", false)
      .single();

    if (profile) {
      const roleCode = ((profile as unknown as { roles?: { role_code?: string } }).roles?.role_code ?? "VIEWER").toString();
      return {
        profileId: (profile as { id: string }).id,
        companyId: (profile as { company_id: string }).company_id,
        authUserId: (profile as { auth_user_id: string | null }).auth_user_id,
        roleCode,
        source: "supabase"
      };
    }
  }

  const cookieStore = await cookies();
  const payload = parseLiffSessionCookie(cookieStore.get(LIFF_SESSION_COOKIE)?.value);
  if (!payload) return null;

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id,company_id,auth_user_id,roles(role_code),active,is_deleted")
    .eq("id", payload.profile_id)
    .eq("company_id", payload.company_id)
    .eq("line_user_id", payload.line_user_id)
    .single();

  if (!profile || !(profile as { active?: boolean }).active || (profile as { is_deleted?: boolean }).is_deleted) return null;

  const roleCode = ((profile as unknown as { roles?: { role_code?: string } }).roles?.role_code ?? "VIEWER").toString();
  return {
    profileId: (profile as { id: string }).id,
    companyId: (profile as { company_id: string }).company_id,
    authUserId: (profile as { auth_user_id: string | null }).auth_user_id,
    roleCode,
    source: "liff"
  };
}
