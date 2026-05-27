import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  display_name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable()
});

type ProfileRow = {
  id: string;
};

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
  try {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const parsed = updateSchema.parse(await req.json());
    const payload = {
      display_name: parsed.display_name?.trim(),
      email: parsed.email && parsed.email.trim() !== "" ? parsed.email.trim() : null,
      phone: parsed.phone && parsed.phone.trim() !== "" ? parsed.phone.trim() : null
    };

    const { data, error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("auth_user_id", user.id)
      .select("id,display_name,email,phone,line_user_id,line_display_name,line_picture_url")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile?.id) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ active: false, is_deleted: true, updated_by: profile.id })
    .eq("id", profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
