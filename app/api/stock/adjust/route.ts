import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/lib/services/stock.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await StockService.adjustStock(body);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
