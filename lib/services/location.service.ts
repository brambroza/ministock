import { createClient } from "@/lib/supabase/server";
import { locationSchema } from "@/lib/validators/schemas";

export const LocationService = {
  async getLocations() {
    const supabase = await createClient();
    return supabase.from("storage_locations").select("*").eq("is_deleted", false).order("location_name");
  },
  async createLocation(input: unknown) {
    const payload = locationSchema.parse(input);
    const supabase = await createClient();
    return supabase.from("storage_locations").insert(payload).select("*").single();
  },
  async updateLocation(id: string, input: unknown) {
    const payload = locationSchema.partial().parse(input);
    const supabase = await createClient();
    return supabase.from("storage_locations").update(payload).eq("id", id).select("*").single();
  }
};
