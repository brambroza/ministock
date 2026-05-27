import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LIFF_SESSION_COOKIE } from "@/lib/auth/liff-session";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LIFF_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
