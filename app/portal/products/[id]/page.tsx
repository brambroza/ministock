/* eslint-disable @next/next/no-img-element */
import { Card, CardContent, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return <Card><CardContent><img src={data?.image_url ?? "https://placehold.co/160x160?text=No+Image"} alt={data?.product_name ?? "product"} style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 12 }} /><Typography variant="h6">{data?.product_name}</Typography><Typography>บาร์โค้ด: {data?.barcode}</Typography><Typography>ราคา: {data?.price}</Typography><Typography>จุดต่ำสุด: {data?.min_stock_qty}</Typography></CardContent></Card>;
}
