import { NextRequest, NextResponse } from "next/server";
import { UnitService } from "@/lib/services/unit.service";

export async function GET() {
  const { data, error } = await UnitService.getUnits();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const { data, error } = await UnitService.createUnit(await req.json());
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
