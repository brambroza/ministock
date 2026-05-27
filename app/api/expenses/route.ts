import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

const saveSchema = z.object({
  document_id: z.string().uuid(),
  vendor_name: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  invoice_no: z.string().optional().nullable(),
  expense_date: z.string().min(8),
  subtotal_amount: z.coerce.number().min(0),
  vat_amount: z.coerce.number().min(0),
  total_amount: z.coerce.number().min(0),
  payment_method: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  remark: z.string().optional().nullable()
});

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = saveSchema.parse(await req.json());

    const { data: doc } = await supabaseAdmin
      .from("expense_documents")
      .select("id,company_id")
      .eq("id", payload.document_id)
      .eq("company_id", actor.companyId)
      .eq("is_deleted", false)
      .single();

    if (!doc) return NextResponse.json({ error: "ไม่พบเอกสารบิล" }, { status: 404 });

    const { data: created, error } = await supabaseAdmin
      .from("expense_claims")
      .insert({
        company_id: actor.companyId,
        document_id: payload.document_id,
        expense_date: payload.expense_date,
        vendor_name: payload.vendor_name ?? null,
        tax_id: payload.tax_id ?? null,
        invoice_no: payload.invoice_no ?? null,
        subtotal_amount: payload.subtotal_amount,
        vat_amount: payload.vat_amount,
        total_amount: payload.total_amount,
        payment_method: payload.payment_method ?? null,
        category: payload.category ?? null,
        remark: payload.remark ?? null,
        created_by: actor.profileId,
        updated_by: actor.profileId
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabaseAdmin.from("audit_logs").insert({
      company_id: actor.companyId,
      action: "CREATE",
      table_name: "expense_claims",
      record_id: created.id,
      new_data: created,
      created_by: actor.profileId,
      updated_by: actor.profileId
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function GET() {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("expense_claims")
      .select("id,expense_date,vendor_name,invoice_no,total_amount,payment_method,category,remark,created_at")
      .eq("company_id", actor.companyId)
      .eq("is_deleted", false)
      .order("expense_date", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
