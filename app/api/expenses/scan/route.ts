import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calcFileHash, parseExpenseFromText, runTyphoonOCR } from "@/lib/services/expense-ocr.service";

const BUCKET = "expense-bills";

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.listBuckets();
  if ((data ?? []).some((b) => b.name === BUCKET)) return;
  await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 8 * 1024 * 1024 });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "ไม่พบไฟล์บิล" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "รองรับเฉพาะรูปภาพ" }, { status: 400 });

    const arr = await file.arrayBuffer();
    const buffer = Buffer.from(arr);
    const fileHash = calcFileHash(buffer);

    const { data: dupByHash } = await supabaseAdmin
      .from("expense_documents")
      .select("id, parse_payload")
      .eq("company_id", actor.companyId)
      .eq("file_hash", fileHash)
      .eq("is_deleted", false)
      .maybeSingle();

    if (dupByHash?.id) {
      return NextResponse.json({ duplicate: true, duplicateType: "FILE_HASH", documentId: dupByHash.id, parsed: dupByHash.parse_payload });
    }

    await ensureBucket();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${actor.companyId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });

    const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { rawText, providerPayload } = await runTyphoonOCR(publicUrl);
    const parsed = parseExpenseFromText(rawText);

    const { data: dupByFp } = await supabaseAdmin
      .from("expense_documents")
      .select("id")
      .eq("company_id", actor.companyId)
      .eq("normalized_fingerprint", parsed.normalized_fingerprint)
      .eq("is_deleted", false)
      .maybeSingle();

    const { data: doc, error: insertErr } = await supabaseAdmin
      .from("expense_documents")
      .insert({
        company_id: actor.companyId,
        image_url: publicUrl,
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
        created_by: actor.profileId,
        updated_by: actor.profileId
      })
      .select("id,image_url,parse_payload,confidence_score,duplicate_of")
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

    return NextResponse.json({
      duplicate: Boolean(doc.duplicate_of),
      duplicateType: doc.duplicate_of ? "FINGERPRINT" : null,
      documentId: doc.id,
      imageUrl: doc.image_url,
      parsed: doc.parse_payload,
      confidenceScore: doc.confidence_score
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
