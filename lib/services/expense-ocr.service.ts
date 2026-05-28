import { createHash } from "crypto";

export type ParsedExpense = {
  vendor_name: string;
  tax_id: string;
  invoice_no: string;
  expense_date: string;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string;
  remark: string;
  confidence_score: number;
  normalized_fingerprint: string;
};

function normalizeDate(input: string): string {
  const s = input.trim();
  const m1 = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m1) return new Date().toISOString().slice(0, 10);
  let y = Number(m1[3]);
  if (String(m1[3]).length <= 2) {
    const yy = y;
    const yGregorian = 2000 + yy;
    const yFromBE = (2500 + yy) - 543;
    const now = new Date().getFullYear();
    y = Math.abs(yGregorian - now) <= Math.abs(yFromBE - now) ? yGregorian : yFromBE;
  }
  if (y > 2400) y -= 543; // BE -> CE
  const d = String(Number(m1[1])).padStart(2, "0");
  const m = String(Number(m1[2])).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toNum(v?: string): number {
  if (!v) return 0;
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseByRegex(rawText: string): ParsedExpense {
  const text = rawText || "";
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

  const vendor = lines[0] ?? "ไม่ระบุร้านค้า";
  const taxId = (text.match(/(?:tax\s*id|เลขประจำตัวผู้เสียภาษี)\s*[:\-]?\s*([0-9\-]{10,20})/i)?.[1] ?? "").replace(/\s/g, "");
  const invoiceNo =
    text.match(/\b(?:E#|R#|POS#)\s*([A-Z0-9\-\/]+)/i)?.[1] ??
    text.match(/(?:invoice|receipt|เลขที่บิล|เลขที่ใบเสร็จ)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i)?.[1] ??
    "";

  const dateCandidate = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)?.[1] ?? new Date().toISOString().slice(0, 10);
  const expenseDate = normalizeDate(dateCandidate);

  const totalMatch =
    text.match(/(?:ยอดสุทธิ|รวมสุทธิ)\s*(?:\d+\s*ชิ้น)?\s*([0-9,]+\.?[0-9]{0,2})/i) ??
    text.match(/(?:grand\s*total|\btotal\b)\s*[:\-]?\s*([0-9,]+\.?[0-9]{0,2})/i);
  const vatMatch = text.match(/(?:vat|ภาษีมูลค่าเพิ่ม)\s*[:\-]?\s*([0-9,]+\.?[0-9]{0,2})/i);
  const subMatch = text.match(/(?:subtotal|ยอดก่อนภาษี)\s*[:\-]?\s*([0-9,]+\.?[0-9]{0,2})/i);

  let total = toNum(totalMatch?.[1]);
  const vat = toNum(vatMatch?.[1]);
  let subtotal = toNum(subMatch?.[1]);

  if (total <= 0) {
    const moneyByLine = lines
      .map((line) => ({
        line,
        nums: [...line.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/g)].map((m) => toNum(m[1]))
      }))
      .filter((row) => row.nums.length > 0)
      .map((row) => ({
        row,
        score:
          (/(ยอดสุทธิ|รวมสุทธิ|total)/i.test(row.line) ? 100 : 0) +
          (/(เงินสด|เงินทอน|change|cash)/i.test(row.line) ? -100 : 0)
      }))
      .sort((a, b) => b.score - a.score);

    if (moneyByLine.length > 0 && moneyByLine[0].score > 0) {
      total = Math.max(...moneyByLine[0].row.nums);
    } else {
      const allMoney = [...text.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/g)]
        .map((m) => toNum(m[1]))
        .filter((n) => n > 0)
        .sort((a, b) => b - a);
      total = allMoney[0] ?? 0;
    }
  }
  if (subtotal <= 0) subtotal = Math.max(total - vat, 0);

  const paymentMethod = /promptpay|โอน|transfer/i.test(text) ? "TRANSFER" : /cash|เงินสด/i.test(text) ? "CASH" : /card|บัตร/i.test(text) ? "CARD" : "UNKNOWN";

  const fingerprintBase = `${vendor}|${taxId}|${invoiceNo}|${expenseDate}|${total.toFixed(2)}`.toLowerCase();
  const normalizedFingerprint = createHash("sha256").update(fingerprintBase).digest("hex");

  let confidence = 60;
  if (invoiceNo) confidence += 10;
  if (taxId) confidence += 10;
  if (total > 0) confidence += 10;
  if (dateCandidate) confidence += 10;

  return {
    vendor_name: vendor,
    tax_id: taxId,
    invoice_no: invoiceNo,
    expense_date: expenseDate,
    subtotal_amount: subtotal,
    vat_amount: vat,
    total_amount: total,
    payment_method: paymentMethod,
    remark: "",
    confidence_score: Math.min(confidence, 98),
    normalized_fingerprint: normalizedFingerprint
  };
}

type TyphoonOptions = {
  imageUrl?: string;
  imageBuffer?: Buffer;
};

function extractText(payload: unknown): string {
  const p = payload as {
    text?: string;
    result?: { text?: string; content?: string };
    data?: { text?: string; content?: string; output_text?: string };
    output_text?: string;
    content?: string;
  };

  return (
    p.text ??
    p.result?.text ??
    p.result?.content ??
    p.data?.text ??
    p.data?.content ??
    p.data?.output_text ??
    p.output_text ??
    p.content ??
    ""
  );
}

async function tryTyphoon(apiUrl: string, apiKey: string, body: Record<string, unknown>) {
  const headersList: Record<string, string>[] = [
    { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    { "content-type": "application/json", "x-api-key": apiKey },
    { "content-type": "application/json", Authorization: `Bearer ${apiKey}` }
  ];

  let lastErr = "Typhoon OCR failed";
  for (const headers of headersList) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) return payload;
    lastErr =
      (payload as { error?: string; message?: string; detail?: string }).error ??
      (payload as { error?: string; message?: string; detail?: string }).message ??
      (payload as { error?: string; message?: string; detail?: string }).detail ??
      `Typhoon OCR failed (${res.status})`;
  }
  throw new Error(lastErr);
}

export async function runTyphoonOCR(options: TyphoonOptions): Promise<{ rawText: string; providerPayload: unknown }> {
  const apiUrl = process.env.TYPHOON_API_URL;
  const apiKey = process.env.TYPHOON_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("TYPHOON_API_URL หรือ TYPHOON_API_KEY ยังไม่ถูกตั้งค่า");
  }

  const bodies: Record<string, unknown>[] = [];
  if (options.imageUrl) {
    bodies.push(
      { image_url: options.imageUrl, task: "ocr" },
      { imageUrl: options.imageUrl, task: "ocr" },
      { input: { image_url: options.imageUrl }, task: "ocr" }
    );
  }
  if (options.imageBuffer) {
    const b64 = options.imageBuffer.toString("base64");
    bodies.push(
      { image_base64: b64, task: "ocr" },
      { image: b64, task: "ocr" },
      { input: { image_base64: b64 }, task: "ocr" }
    );
  }

  let payload: unknown = {};
  let lastErr = "Typhoon OCR failed";
  for (const body of bodies) {
    try {
      payload = await tryTyphoon(apiUrl, apiKey, body);
      const text = extractText(payload);
      if (text.trim()) return { rawText: text, providerPayload: payload };
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }

  throw new Error(lastErr || "Typhoon OCR failed");
}

export function parseExpenseFromText(rawText: string): ParsedExpense {
  return parseByRegex(rawText);
}

export function calcFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
