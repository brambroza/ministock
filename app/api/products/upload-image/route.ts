import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentActor } from "@/lib/auth/actor";

const querySchema = z.object({ productId: z.string().uuid().optional() });

const BUCKET = "product-images";

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.listBuckets();
  const bucket = (data ?? []).find((b) => b.name === BUCKET);
  if (bucket) {
    // ถ้า bucket เคยถูกสร้างเป็น private ให้ปรับเป็น public เพื่อให้ LIFF โหลดรูปได้
    if (!bucket.public) {
      await supabaseAdmin.storage.updateBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    }
    return;
  }
  await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const { productId } = querySchema.parse({ productId: searchParams.get("productId") ?? undefined });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    const type = file.type || "";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์รูปภาพ" }, { status: 400 });
    }

    await ensureBucket();

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `${actor.companyId}/${productId ?? "tmp"}/${randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(key, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key);

    return NextResponse.json({ path: key, publicUrl: pub.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
