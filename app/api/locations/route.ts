import { NextRequest, NextResponse } from "next/server";
import { LocationService } from "@/lib/services/location.service";

export async function GET() {
  const { data, error } = await LocationService.getLocations();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { data, error } = await LocationService.createLocation(await req.json());
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
