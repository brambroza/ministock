import { createClient } from "@/lib/supabase/server";

type AuditPayload = {
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: unknown;
  new_data?: unknown;
};

export const AuditService = {
  async logAction(payload: AuditPayload) {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    const { data: profile } = await supabase.from("user_profiles").select("id, company_id").eq("auth_user_id", user?.id).single();
    await supabase.from("audit_logs").insert({
      ...payload,
      company_id: profile?.company_id,
      created_by: profile?.id,
      updated_by: profile?.id
    });
  }
};
