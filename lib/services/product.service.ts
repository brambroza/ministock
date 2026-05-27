import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validators/schemas";
import { AuditService } from "@/lib/services/audit.service";

export const ProductService = {
  async getProducts(query?: { name?: string; barcode?: string }) {
    const supabase = await createClient();
    let q = supabase.from("products").select("*").eq("is_deleted", false).order("created_at", { ascending: false });
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
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    const { data: profile } = await supabase.from("user_profiles").select("id, company_id").eq("auth_user_id", user?.id).single();
    const { data, error } = await supabase.from("products").insert({ ...payload, company_id: profile?.company_id, created_by: profile?.id, updated_by: profile?.id }).select("*").single();
    if (error) throw error;
    if ((payload.opening_balance ?? 0) > 0) {
      await supabase.from("stock_movements").insert({
        company_id: profile?.company_id,
        product_id: data.id,
        location_id: payload.storage_location_id,
        movement_type: "OPENING",
        qty_in: payload.opening_balance,
        unit_cost: payload.cost,
        created_by: profile?.id,
        updated_by: profile?.id
      });
    }
    await AuditService.logAction({ action: "CREATE", table_name: "products", record_id: data.id, new_data: data });
    return data;
  },
  async updateProduct(id: string, input: unknown) {
    const payload = productSchema.partial().parse(input);
    const supabase = await createClient();
    const { data } = await supabase.from("products").update(payload).eq("id", id).select("*").single();
    await AuditService.logAction({ action: "UPDATE", table_name: "products", record_id: id, new_data: data });
    return data;
  },
  async softDeleteProduct(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("products").update({ is_deleted: true, active: false }).eq("id", id);
    if (error) throw error;
    await AuditService.logAction({ action: "DELETE", table_name: "products", record_id: id });
  }
};
