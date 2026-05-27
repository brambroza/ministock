import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { StockService } from "@/lib/services/stock.service";

export default async function Page() {
  const { data } = await StockService.getStockOnHand();
  return <Card><CardContent><Typography variant="h5" mb={2}>สต๊อกคงเหลือ</Typography><Table size="small"><TableHead><TableRow><TableCell>สินค้า</TableCell><TableCell>คลัง</TableCell><TableCell>คงเหลือ</TableCell><TableCell>สถานะ</TableCell></TableRow></TableHead><TableBody>{(data ?? []).map((r)=> <TableRow key={r.product_id + r.location_name}><TableCell>{r.product_name}</TableCell><TableCell>{r.location_name}</TableCell><TableCell>{r.qty_on_hand}</TableCell><TableCell>{r.status}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>;
}
