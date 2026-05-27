import { createClient } from "@/lib/supabase/server";
import { locationSchema } from "@/lib/validators/schemas";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const LocationService = {
  async getLocations() {
    const actor = await getCurrentActor();
    const supabase = actor ? supabaseAdmin : await createClient();
    let q = supabase.from("storage_locations").select("*").eq("is_deleted", false).order("location_name");
    if (actor) q = q.eq("company_id", actor.companyId);
    return q;
  },
  async createLocation(input: unknown) {
    const payload = locationSchema.parse(input);
    const actor = await getCurrentActor();
    if (!actor) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");

    return supabaseAdmin
      .from("storage_locations")
      .insert({
        ...payload,
        company_id: actor.companyId,
        created_by: actor.profileId,
        updated_by: actor.profileId
      })
      .select("*")
      .single();
  },
  async updateLocation(id: string, input: unknown) {
    const payload = locationSchema.partial().parse(input);
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");

    return supabaseAdmin
      .from("storage_locations")
      .update({ ...payload, updated_by: actor.profileId })
      .eq("id", id).eq("company_id", actor.companyId)
      .select("*")
      .single();
  },
  async softDeleteLocation(id: string) {
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");

    return supabaseAdmin
      .from("storage_locations")
      .update({ is_deleted: true, active: false, updated_by: actor.profileId })
      .eq("id", id).eq("company_id", actor.companyId);
  }
};
