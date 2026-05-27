import { createClient } from "@/lib/supabase/server";
import { unitSchema } from "@/lib/validators/schemas";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const UnitService = {
  async getUnits() {
    const actor = await getCurrentActor();
    const supabase = actor ? supabaseAdmin : await createClient();
    let q = supabase.from("units").select("*").eq("is_deleted", false).order("unit_name");
    if (actor) q = q.eq("company_id", actor.companyId);
    return q;
  },
  async createUnit(input: unknown) {
    const payload = unitSchema.parse(input);
    const actor = await getCurrentActor();
    if (!actor) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");

    return supabaseAdmin
      .from("units")
      .insert({
        ...payload,
        company_id: actor.companyId,
        created_by: actor.profileId,
        updated_by: actor.profileId
      })
      .select("*")
      .single();
  },
  async updateUnit(id: string, input: unknown) {
    const payload = unitSchema.partial().parse(input);
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");

    return supabaseAdmin
      .from("units")
      .update({ ...payload, updated_by: actor.profileId })
      .eq("id", id).eq("company_id", actor.companyId)
      .select("*")
      .single();
  },
  async softDeleteUnit(id: string) {
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");

    return supabaseAdmin
      .from("units")
      .update({ is_deleted: true, active: false, updated_by: actor.profileId })
      .eq("id", id).eq("company_id", actor.companyId);
  }
};
