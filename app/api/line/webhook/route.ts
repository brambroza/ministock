import { createHmac, timingSafeEqual } from "crypto";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function defaultQuickReplyItems() {
  return [
    { type: "action", action: { type: "message", label: "สินค้าคงเหลือ", text: "สินค้าคงเหลือ" } },
    { type: "action", action: { type: "message", label: "สินค้าต้องซื้อ", text: "สินค้าต้องซื้อ" } },
    { type: "action", action: { type: "message", label: "สรุปยอดคงเหลือ", text: "สรุปยอดคงเหลือ" } },
    { type: "action", action: { type: "message", label: "สรุปยอดซื้อต่อเดือน", text: "สรุปยอดซื้อต่อเดือน" } }
  ];
}

async function replyMessage(replyToken: string, text: string, withQuickReply = true) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
          ...(withQuickReply ? { quickReply: { items: defaultQuickReplyItems() } } : {})
        }
      ]
    })
  });
}

function normalizeText(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectIntent(text: string) {
  const t = normalizeText(text);
  if (t.includes("สินค้าต้องซื้อ") || (t.includes("สินค้า") && t.includes("ขั้นต่ำ")) || t.includes("ใกล้หมด")) {
    return "LOW_STOCK" as const;
  }
  if (t.includes("สรุปยอดซื้อต่อเดือน") || (t.includes("สรุป") && t.includes("ซื้อ") && t.includes("เดือน"))) {
    return "MONTHLY_PURCHASE" as const;
  }
  if (t.includes("สรุปยอดคงเหลือ") || (t.includes("สรุป") && t.includes("คงเหลือ"))) {
    return "SUMMARY_ON_HAND" as const;
  }
  if (t.includes("สินค้าคงเหลือ") || (t.includes("สินค้า") && t.includes("คงเหลือ"))) {
    return "ON_HAND_LIST" as const;
  }
  return "UNKNOWN" as const;
}

async function getCompanyByLineUserId(lineUserId: string) {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("company_id, display_name, line_display_name")
    .eq("line_user_id", lineUserId)
    .eq("active", true)
    .eq("is_deleted", false)
    .limit(1)
    .single();

  return data;
}

async function buildReply(companyId: string, intent: ReturnType<typeof detectIntent>) {
  if (intent === "ON_HAND_LIST") {
    const { data, error } = await supabaseAdmin
      .from("stock_on_hand_view")
      .select("product_name,qty_on_hand,unit_name,location_name,status")
      .eq("company_id", companyId)
      .order("product_name")
      .limit(12);

    if (error) return "ไม่สามารถดึงข้อมูลสินค้าคงเหลือได้ในขณะนี้";
    if (!data || data.length === 0) return "ไม่พบข้อมูลสินค้าคงเหลือ";

    return [
      "สินค้าคงเหลือ (ตัวอย่าง)",
      ...data.map((r, i) => `${i + 1}. ${r.product_name} ${Number(r.qty_on_hand)} ${r.unit_name ?? ""} (${r.location_name ?? "-"})`)
    ].join("\n");
  }

  if (intent === "LOW_STOCK") {
    const { data, error } = await supabaseAdmin
      .from("stock_on_hand_view")
      .select("product_name,qty_on_hand,min_stock_qty,unit_name")
      .eq("company_id", companyId)
      .in("status", ["Low Stock", "Out of Stock"])
      .order("qty_on_hand", { ascending: true })
      .limit(20);

    if (error) return "ไม่สามารถดึงรายการสินค้าใกล้หมดได้ในขณะนี้";
    if (!data || data.length === 0) return "ไม่มีสินค้าใกล้หมดในตอนนี้";

    return [
      "สินค้าต้องซื้อ / ใกล้หมด",
      ...data.map((r, i) => `${i + 1}. ${r.product_name} คงเหลือ ${Number(r.qty_on_hand)} (ขั้นต่ำ ${Number(r.min_stock_qty)}) ${r.unit_name ?? ""}`)
    ].join("\n");
  }

  if (intent === "SUMMARY_ON_HAND") {
    const { data, error } = await supabaseAdmin
      .from("stock_on_hand_view")
      .select("qty_on_hand,stock_value,status")
      .eq("company_id", companyId);

    if (error) return "ไม่สามารถสรุปยอดคงเหลือได้ในขณะนี้";

    const totalQty = (data ?? []).reduce((sum, row) => sum + Number(row.qty_on_hand ?? 0), 0);
    const totalValue = (data ?? []).reduce((sum, row) => sum + Number(row.stock_value ?? 0), 0);
    const low = (data ?? []).filter((r) => r.status === "Low Stock").length;
    const out = (data ?? []).filter((r) => r.status === "Out of Stock").length;

    return [
      "สรุปยอดคงเหลือ",
      `จำนวนรวม: ${totalQty.toLocaleString()} หน่วย`,
      `มูลค่าสต๊อก: ${totalValue.toLocaleString()} บาท`,
      `สินค้าใกล้หมด: ${low} รายการ`,
      `สินค้าหมด: ${out} รายการ`
    ].join("\n");
  }

  if (intent === "MONTHLY_PURCHASE") {
    const month = dayjs().format("YYYY-MM-01");
    const monthLabel = dayjs(month).format("MM/YYYY");

    const { data, error } = await supabaseAdmin.rpc("get_monthly_purchase_summary", {
      p_company_id: companyId,
      p_month: month
    });

    if (error) return "ไม่สามารถสรุปยอดซื้อต่อเดือนได้ในขณะนี้";

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return `ไม่พบข้อมูลยอดซื้อเดือน ${monthLabel}`;

    const totalQty = rows.reduce((sum, r) => sum + Number(r.total_received_qty ?? 0), 0);
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_purchase_amount ?? 0), 0);
    const top5 = rows
      .sort((a, b) => Number(b.total_purchase_amount ?? 0) - Number(a.total_purchase_amount ?? 0))
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.product_name} ${Number(r.total_purchase_amount ?? 0).toLocaleString()} บาท`);

    return [
      `สรุปยอดซื้อเดือน ${monthLabel}`,
      `ปริมาณรับเข้ารวม: ${totalQty.toLocaleString()} หน่วย`,
      `ยอดซื้อรวม: ${totalAmount.toLocaleString()} บาท`,
      "Top รายการซื้อ:",
      ...top5
    ].join("\n");
  }

  return [
    "พิมพ์คำสั่งที่รองรับ เช่น",
    "- สินค้าคงเหลือ",
    "- สินค้าขั้นต่ำ",
    "- สินค้าต้องซื้อ",
    "- สรุปยอดคงเหลือ",
    "- สรุปยอดซื้อต่อเดือน"
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = payload.events ?? [];

  for (const event of events) {
    if (event.type !== "message") continue;
    if (event.message?.type !== "text") continue;
    if (!event.replyToken || !event.source?.userId) continue;

    const profile = await getCompanyByLineUserId(event.source.userId);

    if (!profile?.company_id) {
      await replyMessage(event.replyToken, "ไม่พบสิทธิ์ใช้งานระบบ กรุณาเปิด LIFF และผูกบัญชีผู้ใช้ก่อน");
      continue;
    }

    const intent = detectIntent(event.message.text ?? "");
    const answer = await buildReply(profile.company_id, intent);
    await replyMessage(event.replyToken, answer);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "LINE webhook endpoint is ready" });
}
