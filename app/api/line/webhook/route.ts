import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";
import { calcFileHash, parseExpenseFromText, runTyphoonOCR } from "@/lib/services/expense-ocr.service";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id?: string; type?: string; text?: string };
};

type LineUserProfile = {
  id: string;
  company_id: string;
  display_name: string;
  line_display_name: string | null;
};

type LineMessage = {
  type: "text" | "flex";
  text?: string;
  quickReply?: { items: ReadonlyArray<{ type: "action"; action: { type: "message"; label: string; text: string } }> };
  altText?: string;
  contents?: Record<string, unknown>;
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
  ] as const;
}

async function replyRaw(replyToken: string, messages: LineMessage[]) {
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
      messages
    })
  });
}

async function replyMessage(replyToken: string, text: string, withQuickReply = true) {
  await replyRaw(replyToken, [
    {
      type: "text",
      text,
      ...(withQuickReply ? { quickReply: { items: defaultQuickReplyItems() } } : {})
    }
  ]);
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
    .select("id, company_id, display_name, line_display_name")
    .eq("line_user_id", lineUserId)
    .eq("active", true)
    .eq("is_deleted", false)
    .limit(1)
    .single();

  return data as LineUserProfile | null;
}

async function ensureExpenseBucket() {
  const bucket = "expense-bills";
  const { data } = await supabaseAdmin.storage.listBuckets();
  if ((data ?? []).some((b) => b.name === bucket)) return bucket;
  await supabaseAdmin.storage.createBucket(bucket, { public: true, fileSizeLimit: 8 * 1024 * 1024 });
  return bucket;
}

async function fetchLineImageContent(messageId: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");

  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!res.ok) throw new Error("ไม่สามารถดาวน์โหลดรูปจาก LINE ได้");

  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function buildExpenseFlex(parsed: ReturnType<typeof parseExpenseFromText>, duplicateType: "FILE_HASH" | "FINGERPRINT" | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const expenseUrl = `${appUrl}/portal/expenses/scan`;
  const duplicateText = duplicateType === "FILE_HASH"
    ? "พบไฟล์บิลนี้ซ้ำ ระบบไม่บันทึกซ้ำ"
    : duplicateType === "FINGERPRINT"
      ? "พบข้อมูลบิลคล้ายรายการเดิม ระบบยังบันทึกให้ กรุณาตรวจสอบ"
      : "บันทึกรายการค่าใช้จ่ายอัตโนมัติสำเร็จ";

  return {
    type: "bubble",
    size: "giga",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "สรุปบิลค่าใช้จ่าย", weight: "bold", size: "xl" },
        { type: "text", text: duplicateText, size: "sm", color: duplicateType ? "#d97706" : "#16a34a", wrap: true },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          margin: "md",
          contents: [
            { type: "text", text: `ร้านค้า: ${parsed.vendor_name || "-"}`, size: "sm", wrap: true },
            { type: "text", text: `เลขที่บิล: ${parsed.invoice_no || "-"}`, size: "sm", wrap: true },
            { type: "text", text: `วันที่: ${parsed.expense_date || "-"}`, size: "sm" },
            { type: "text", text: `ยอดรวม: ${Number(parsed.total_amount || 0).toLocaleString()} บาท`, weight: "bold", size: "md" },
            { type: "text", text: `OCR Confidence: ${Number(parsed.confidence_score || 0).toFixed(0)}%`, size: "xs", color: "#64748b" }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          action: {
            type: "uri",
            label: "ดูรายละเอียดค่าใช้จ่ายล่าสุด",
            uri: expenseUrl
          },
          color: "#06C755"
        }
      ]
    }
  };
}

async function processExpenseImage(replyToken: string, profile: LineUserProfile, messageId: string) {
  const imageBuffer = await fetchLineImageContent(messageId);
  const fileHash = calcFileHash(imageBuffer);

  const { data: dupByHash } = await supabaseAdmin
    .from("expense_documents")
    .select("id, parse_payload")
    .eq("company_id", profile.company_id)
    .eq("file_hash", fileHash)
    .eq("is_deleted", false)
    .maybeSingle();

  if (dupByHash?.id) {
    const parsed = (dupByHash.parse_payload ?? {}) as ReturnType<typeof parseExpenseFromText>;
    await replyRaw(replyToken, [
      {
        type: "flex",
        altText: "พบไฟล์บิลซ้ำ",
        contents: buildExpenseFlex(parsed, "FILE_HASH")
      }
    ]);
    return;
  }

  const bucket = await ensureExpenseBucket();
  const path = `${profile.company_id}/${dayjs().format("YYYY-MM-DD")}/${randomUUID()}.jpg`;
  const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(path, imageBuffer, {
    contentType: "image/jpeg",
    upsert: false
  });
  if (uploadErr) throw new Error(uploadErr.message);

  const imageUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const { rawText, providerPayload } = await runTyphoonOCR({ imageUrl, imageBuffer });
  const parsed = parseExpenseFromText(rawText);

  const { data: dupByFp } = await supabaseAdmin
    .from("expense_documents")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("normalized_fingerprint", parsed.normalized_fingerprint)
    .eq("is_deleted", false)
    .maybeSingle();

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("expense_documents")
    .insert({
      company_id: profile.company_id,
      image_url: imageUrl,
      image_path: path,
      file_hash: fileHash,
      normalized_fingerprint: parsed.normalized_fingerprint,
      ocr_provider: "TYPHOON",
      ocr_status: "PARSED",
      ocr_raw_text: rawText,
      ocr_payload: providerPayload,
      parse_payload: parsed,
      duplicate_of: dupByFp?.id ?? null,
      confidence_score: parsed.confidence_score,
      created_by: profile.id,
      updated_by: profile.id
    })
    .select("id")
    .single();

  if (docErr || !doc?.id) throw new Error(docErr?.message ?? "ไม่สามารถบันทึกเอกสารบิลได้");

  const { data: claim, error: claimErr } = await supabaseAdmin
    .from("expense_claims")
    .insert({
      company_id: profile.company_id,
      document_id: doc.id,
      expense_date: parsed.expense_date,
      vendor_name: parsed.vendor_name || null,
      tax_id: parsed.tax_id || null,
      invoice_no: parsed.invoice_no || null,
      subtotal_amount: Number(parsed.subtotal_amount || 0),
      vat_amount: Number(parsed.vat_amount || 0),
      total_amount: Number(parsed.total_amount || 0),
      payment_method: parsed.payment_method || "UNKNOWN",
      category: "GENERAL",
      remark: parsed.remark || null,
      created_by: profile.id,
      updated_by: profile.id
    })
    .select("*")
    .single();

  if (claimErr || !claim?.id) throw new Error(claimErr?.message ?? "ไม่สามารถบันทึกรายการค่าใช้จ่ายได้");

  await supabaseAdmin.from("audit_logs").insert({
    company_id: profile.company_id,
    action: "CREATE",
    table_name: "expense_claims",
    record_id: claim.id,
    new_data: claim,
    created_by: profile.id,
    updated_by: profile.id
  });

  await replyRaw(replyToken, [
    {
      type: "flex",
      altText: "สรุปบิลค่าใช้จ่าย",
      contents: buildExpenseFlex(parsed, dupByFp?.id ? "FINGERPRINT" : null)
    }
  ]);
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
    if (!event.replyToken || !event.source?.userId) continue;

    const profile = await getCompanyByLineUserId(event.source.userId);

    if (!profile?.company_id) {
      await replyMessage(event.replyToken, "ไม่พบสิทธิ์ใช้งานระบบ กรุณาเปิด LIFF และผูกบัญชีผู้ใช้ก่อน");
      continue;
    }

    if (event.message?.type === "image" && event.message.id) {
      try {
        await processExpenseImage(event.replyToken, profile, event.message.id);
      } catch (e) {
        await replyMessage(event.replyToken, `อ่านบิลไม่สำเร็จ: ${(e as Error).message}`, false);
      }
      continue;
    }

    if (event.message?.type !== "text") continue;
    const intent = detectIntent(event.message.text ?? "");
    const answer = await buildReply(profile.company_id, intent);
    await replyMessage(event.replyToken, answer);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "LINE webhook endpoint is ready" });
}
