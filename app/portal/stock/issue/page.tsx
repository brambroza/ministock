import { Card, CardContent, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/server";
import { StockMovementForm } from "@/components/stock/StockMovementForm";
export default async function Page() {
  const supabase = await createClient();
  const [{ data: products }, { data: locations }] = await Promise.all([supabase.from("products").select("id, product_name"), supabase.from("storage_locations").select("id, location_name")]);
  return <Card><CardContent><Typography variant="h5" mb={2}>เบิกออกสินค้า</Typography><StockMovementForm action="issue" products={(products ?? []).map((p)=>({ id: p.id, name: p.product_name }))} locations={(locations ?? []).map((l)=>({ id: l.id, name: l.location_name }))} /></CardContent></Card>;
}
