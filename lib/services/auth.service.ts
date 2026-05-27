import { createClient } from "@/lib/supabase/server";

export const AuthService = {
  async getCurrentUser() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
  async getCurrentCompany() {
    const supabase = await createClient();
    const { data } = await supabase.from("user_profiles").select("company_id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id).single();
    return data?.company_id as string | undefined;
  },
  async checkPermission(permissionCode: string) {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;
    const { data: role } = await supabase
      .from("user_profiles")
      .select("roles(role_code)")
      .eq("auth_user_id", user.id)
      .single();
    const roleCode = ((role as unknown as { roles?: { role_code?: string } }).roles?.role_code) ?? "VIEWER";
    if (["SUPER_ADMIN", "COMPANY_ADMIN"].includes(roleCode)) return true;
    const { data } = await supabase
      .from("role_permissions")
      .select("permissions(permission_code)")
      .eq("role_id", (await supabase.from("user_profiles").select("role_id").eq("auth_user_id", user.id).single()).data?.role_id)
      .eq("permissions.permission_code", permissionCode);
    return (data?.length ?? 0) > 0;
  },
  async bindLineUser(input: { line_user_id: string; line_display_name?: string; line_picture_url?: string | null }) {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Unauthorized");
    return supabase
      .from("user_profiles")
      .update({
        line_user_id: input.line_user_id,
        line_display_name: input.line_display_name,
        line_picture_url: input.line_picture_url ?? null
      })
      .eq("auth_user_id", user.id);
  }
};
