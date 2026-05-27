import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const lineUserId = cookieStore.get("pending_line_user_id")?.value;
  const lineDisplayName = cookieStore.get("pending_line_display_name")?.value;
  const linePictureUrl = cookieStore.get("pending_line_picture_url")?.value;

  if (!lineUserId) {
    return NextResponse.json({ ok: true, linked: false });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile?.id) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      line_user_id: lineUserId,
      line_display_name: lineDisplayName ?? null,
      line_picture_url: linePictureUrl ?? null
    })
    .eq("id", profile.id);

  const res = error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ ok: true, linked: true });

  res.cookies.set("pending_line_user_id", "", { path: "/", maxAge: 0 });
  res.cookies.set("pending_line_display_name", "", { path: "/", maxAge: 0 });
  res.cookies.set("pending_line_picture_url", "", { path: "/", maxAge: 0 });
  return res;
}
