import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/lib/services/stock.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { data, error } = await StockService.getStockOnHand({
      product_name: searchParams.get("product_name") ?? undefined,
      barcode: searchParams.get("barcode") ?? undefined,
      status: searchParams.get("status") ?? undefined
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
