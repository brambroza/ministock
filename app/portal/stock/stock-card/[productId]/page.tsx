import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import dayjs from "dayjs";
import { StockService } from "@/lib/services/stock.service";

type StockCardRow = {
  id: string;
  movement_date: string;
  movement_type: string;
  qty_in: number;
  qty_out: number;
  balance_qty: number;
};

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { data } = await StockService.getStockCard(productId, dayjs().subtract(30, "day").toISOString(), dayjs().toISOString());
  return <Card><CardContent><Typography variant="h5">การ์ดสต๊อก</Typography><Table size="small"><TableHead><TableRow><TableCell>วันที่</TableCell><TableCell>ประเภท</TableCell><TableCell>เข้า</TableCell><TableCell>ออก</TableCell><TableCell>คงเหลือ</TableCell></TableRow></TableHead><TableBody>{((data ?? []) as StockCardRow[]).map((r) => <TableRow key={r.id}><TableCell>{dayjs(r.movement_date).format('DD/MM/YYYY HH:mm')}</TableCell><TableCell>{r.movement_type}</TableCell><TableCell>{r.qty_in}</TableCell><TableCell>{r.qty_out}</TableCell><TableCell>{r.balance_qty}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>;
}
