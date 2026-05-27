import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/lib/services/product.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { data, error } = await ProductService.getProducts({ name: searchParams.get("name") ?? undefined, barcode: searchParams.get("barcode") ?? undefined });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const data = await ProductService.createProduct(await req.json());
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
