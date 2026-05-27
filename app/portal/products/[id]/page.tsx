import { Card, CardContent, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return <Card><CardContent><Typography variant="h6">{data?.product_name}</Typography><Typography>บาร์โค้ด: {data?.barcode}</Typography><Typography>ราคา: {data?.price}</Typography><Typography>จุดต่ำสุด: {data?.min_stock_qty}</Typography></CardContent></Card>;
}
