import { createClient } from "@/lib/supabase/server";
import { unitSchema } from "@/lib/validators/schemas";

export const UnitService = {
  async getUnits() {
    const supabase = await createClient();
    return supabase.from("units").select("*").eq("is_deleted", false).order("unit_name");
  },
  async createUnit(input: unknown) {
    const payload = unitSchema.parse(input);
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      throw new Error("ไม่พบข้อมูลบริษัทของผู้ใช้งาน");
    }

    return supabase
      .from("units")
      .insert({
        ...payload,
        company_id: profile.company_id,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select("*")
      .single();
  },
  async updateUnit(id: string, input: unknown) {
    const payload = unitSchema.partial().parse(input);
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", user?.id)
      .single();

    return supabase
      .from("units")
      .update({ ...payload, updated_by: profile?.id })
      .eq("id", id)
      .select("*")
      .single();
  },
  async softDeleteUnit(id: string) {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", user?.id)
      .single();

    return supabase
      .from("units")
      .update({ is_deleted: true, active: false, updated_by: profile?.id })
      .eq("id", id);
  }
};
