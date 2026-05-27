import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/lib/services/auth.service";

const schema = z.object({ line_user_id: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const payload = schema.parse(await req.json());
    const { error } = await AuthService.bindLineUser(payload.line_user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
