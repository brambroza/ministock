import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/lib/services/stock.service";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OnHandRow = {
  product_id: string;
  barcode: string;
  product_name: string;
  unit_name: string | null;
  location_name: string | null;
  qty_on_hand: number;
  min_stock_qty: number;
  price: number;
  stock_value: number;
  status: "Normal" | "Low Stock" | "Out of Stock";
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { data, error } = await StockService.getStockOnHand({
      product_name: searchParams.get("product_name") ?? undefined,
      barcode: searchParams.get("barcode") ?? undefined,
      status: searchParams.get("status") ?? undefined
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (data ?? []) as OnHandRow[];
    const actor = await getCurrentActor();
    if (!actor || rows.length === 0) return NextResponse.json(rows);

    const productIds = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean)));
    if (productIds.length === 0) return NextResponse.json(rows);

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id,image_url")
      .eq("company_id", actor.companyId)
      .in("id", productIds)
      .eq("is_deleted", false);

    const imageMap = new Map((products ?? []).map((p) => [p.id, p.image_url ?? null]));
    const merged = rows.map((r) => ({ ...r, image_url: imageMap.get(r.product_id) ?? null }));
    return NextResponse.json(merged);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
