import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stock_movements")
      .select("id,movement_date,movement_type,qty_in,qty_out,balance_qty,unit_cost,reference_no,remark,products(id,product_name,barcode),storage_locations(id,location_name)")
      .eq("is_deleted", false)
      .order("movement_date", { ascending: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
