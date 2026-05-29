import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: units, error: unitsErr }, { data: locations, error: locErr }] = await Promise.all([
      supabaseAdmin
        .from("units")
        .select("id,unit_code,unit_name")
        .eq("company_id", actor.companyId)
        .eq("is_deleted", false)
        .eq("active", true)
        .order("unit_name"),
      supabaseAdmin
        .from("storage_locations")
        .select("id,location_code,location_name")
        .eq("company_id", actor.companyId)
        .eq("is_deleted", false)
        .eq("active", true)
        .order("location_name")
    ]);

    if (unitsErr) return NextResponse.json({ error: unitsErr.message }, { status: 400 });
    if (locErr) return NextResponse.json({ error: locErr.message }, { status: 400 });

    return NextResponse.json({
      units: units ?? [],
      locations: locations ?? []
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
