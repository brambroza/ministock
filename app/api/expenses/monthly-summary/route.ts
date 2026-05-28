import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const monthParam = req.nextUrl.searchParams.get("month") || dayjs().format("YYYY-MM");
    const monthStart = dayjs(`${monthParam}-01`).startOf("month");
    if (!monthStart.isValid()) {
      return NextResponse.json({ error: "รูปแบบเดือนไม่ถูกต้อง" }, { status: 400 });
    }

    const monthEnd = monthStart.endOf("month");

    const [{ data: summary }, { data: compare }, { data: claims, error: claimsError }] = await Promise.all([
      supabaseAdmin.rpc("get_monthly_expense_summary", {
        p_company_id: actor.companyId,
        p_month: monthStart.format("YYYY-MM-DD")
      }),
      supabaseAdmin.rpc("get_monthly_expense_compare", {
        p_company_id: actor.companyId,
        p_month: monthStart.format("YYYY-MM-DD")
      }),
      supabaseAdmin
        .from("expense_claims")
        .select("id,expense_date,vendor_name,invoice_no,total_amount,payment_method,category,remark")
        .eq("company_id", actor.companyId)
        .eq("is_deleted", false)
        .gte("expense_date", monthStart.format("YYYY-MM-DD"))
        .lte("expense_date", monthEnd.format("YYYY-MM-DD"))
        .order("expense_date", { ascending: false })
    ]);

    if (claimsError) return NextResponse.json({ error: claimsError.message }, { status: 400 });

    const rows = Array.isArray(claims) ? claims : [];
    const byVendorMap = new Map<string, number>();
    const byPaymentMap = new Map<string, number>();

    for (const r of rows) {
      const vendor = (r.vendor_name || "ไม่ระบุร้านค้า").trim();
      const payment = (r.payment_method || "UNKNOWN").trim();
      const amount = Number(r.total_amount || 0);
      byVendorMap.set(vendor, (byVendorMap.get(vendor) || 0) + amount);
      byPaymentMap.set(payment, (byPaymentMap.get(payment) || 0) + amount);
    }

    const byVendor = [...byVendorMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const byPayment = [...byPaymentMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      month: monthStart.format("YYYY-MM"),
      summary: Array.isArray(summary) ? summary[0] ?? null : null,
      compare: Array.isArray(compare) ? compare[0] ?? null : null,
      byVendor,
      byPayment,
      claims: rows
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
