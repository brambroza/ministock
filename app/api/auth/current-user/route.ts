import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export async function GET() {
  const user = await AuthService.getCurrentUser();
  return NextResponse.json(user);
}
