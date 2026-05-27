import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  display_name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable()
});

export async function GET() {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id,display_name,email,phone,line_user_id,line_display_name,line_picture_url")
    .eq("auth_user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = updateSchema.parse(await req.json());
  const { data, error } = await supabase
    .from("user_profiles")
    .update(payload)
    .eq("auth_user_id", user.id)
    .select("id,display_name,email,phone,line_user_id,line_display_name,line_picture_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
