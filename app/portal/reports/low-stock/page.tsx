import { Card, CardContent, Typography } from "@mui/material";
import { StockService } from "@/lib/services/stock.service";
export default async function Page() {
  const { data } = await StockService.getStockOnHand({ status: "Low Stock" });
  return <Card><CardContent><Typography variant="h5">รายการสินค้าใกล้หมด</Typography><pre>{JSON.stringify(data, null, 2)}</pre></CardContent></Card>;
}
