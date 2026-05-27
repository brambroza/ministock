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
    return supabase.from("units").insert(payload).select("*").single();
  },
  async updateUnit(id: string, input: unknown) {
    const payload = unitSchema.partial().parse(input);
    const supabase = await createClient();
    return supabase.from("units").update(payload).eq("id", id).select("*").single();
  }
};
