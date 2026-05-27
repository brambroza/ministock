import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validators/schemas";
import { AuditService } from "@/lib/services/audit.service";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const ProductService = {
  async getProducts(query?: { name?: string; barcode?: string }) {
    const actor = await getCurrentActor();
    const supabase = actor ? supabaseAdmin : await createClient();
    let q = supabase
      .from("products")
      .select("*, units(unit_name)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (actor) q = q.eq("company_id", actor.companyId);
    if (query?.name) q = q.ilike("product_name", `%${query.name}%`);
    if (query?.barcode) q = q.ilike("barcode", `%${query.barcode}%`);
    return q;
  },
  async getProductByBarcode(barcode: string) {
    const supabase = await createClient();
    return supabase.from("products").select("*").eq("barcode", barcode).eq("is_deleted", false).single();
  },
  async createProduct(input: unknown) {
    const payload = productSchema.parse(input);
    const { opening_balance, ...productPayload } = payload;
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");
    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({ ...productPayload, company_id: actor.companyId, created_by: actor.profileId, updated_by: actor.profileId })
      .select("*")
      .single();
    if (error) throw error;
    if ((opening_balance ?? 0) > 0) {
      await supabaseAdmin.from("stock_movements").insert({
        company_id: actor.companyId,
        product_id: data.id,
        location_id: payload.storage_location_id,
        movement_type: "OPENING",
        qty_in: opening_balance,
        unit_cost: payload.cost,
        created_by: actor.profileId,
        updated_by: actor.profileId
      });
    }
    await AuditService.logAction({ action: "CREATE", table_name: "products", record_id: data.id, new_data: data });
    return data;
  },
  async updateProduct(id: string, input: unknown) {
    const payload = productSchema.partial().parse(input);
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ ...payload, updated_by: actor.profileId })
      .eq("id", id)
      .eq("company_id", actor.companyId)
      .eq("is_deleted", false)
      .select("*")
      .single();
    if (error) throw error;
    await AuditService.logAction({ action: "UPDATE", table_name: "products", record_id: id, new_data: data });
    return data;
  },
  async softDeleteProduct(id: string) {
    const actor = await getCurrentActor();
    if (!actor) throw new Error("Unauthorized");
    const { error } = await supabaseAdmin
      .from("products")
      .update({ is_deleted: true, active: false, updated_by: actor.profileId })
      .eq("id", id)
      .eq("company_id", actor.companyId)
      .eq("is_deleted", false);
    if (error) throw error;
    await AuditService.logAction({ action: "DELETE", table_name: "products", record_id: id });
  }
};
