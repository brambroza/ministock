import { createClient } from "@/lib/supabase/server";
import { stockTxnSchema } from "@/lib/validators/schemas";
import { AuditService } from "@/lib/services/audit.service";

async function baseMovement(type: "RECEIVE" | "ISSUE" | "ADJUST_IN" | "ADJUST_OUT", input: unknown) {
  const payload = stockTxnSchema.parse(input);
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  const { data: profile } = await supabase.from("user_profiles").select("id, company_id").eq("auth_user_id", user?.id).single();
  const qty_in = ["RECEIVE", "ADJUST_IN"].includes(type) ? payload.quantity : 0;
  const qty_out = ["ISSUE", "ADJUST_OUT"].includes(type) ? payload.quantity : 0;

  const { data, error } = await supabase.from("stock_movements").insert({
    company_id: profile?.company_id,
    movement_type: type,
    product_id: payload.product_id,
    location_id: payload.location_id,
    qty_in,
    qty_out,
    unit_cost: payload.unit_cost ?? 0,
    reference_no: payload.reference_no,
    remark: payload.remark,
    created_by: profile?.id,
    updated_by: profile?.id
  }).select("*").single();

  if (error) throw error;
  await AuditService.logAction({ action: type, table_name: "stock_movements", record_id: data.id, new_data: data });
  return data;
}

export const StockService = {
  receiveStock: (input: unknown) => baseMovement("RECEIVE", input),
  issueStock: (input: unknown) => baseMovement("ISSUE", input),
  adjustStock: async (input: unknown & { direction?: "IN" | "OUT" }) => baseMovement(input.direction === "OUT" ? "ADJUST_OUT" : "ADJUST_IN", input),
  async getStockOnHand(filters?: { product_name?: string; barcode?: string; status?: string }) {
    const supabase = await createClient();
    let q = supabase.from("stock_on_hand_view").select("*");
    if (filters?.product_name) q = q.ilike("product_name", `%${filters.product_name}%`);
    if (filters?.barcode) q = q.ilike("barcode", `%${filters.barcode}%`);
    if (filters?.status) q = q.eq("status", filters.status);
    return q;
  },
  async getStockCard(productId: string, dateFrom: string, dateTo: string) {
    const supabase = await createClient();
    return supabase.rpc("get_stock_card", { p_product_id: productId, p_date_from: dateFrom, p_date_to: dateTo });
  },
  async getMonthlyPurchaseSummary(month: string, companyId: string) {
    const supabase = await createClient();
    return supabase.rpc("get_monthly_purchase_summary", { p_company_id: companyId, p_month: month });
  },
  async getMonthlyBalanceSummary(month: string, companyId: string) {
    const supabase = await createClient();
    return supabase.rpc("get_monthly_stock_balance", { p_company_id: companyId, p_month: month });
  }
};
