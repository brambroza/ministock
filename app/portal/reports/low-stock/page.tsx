import { Stack, Typography } from "@mui/material";
import LowStockReportClient from "./LowStockReportClient";
import { StockService } from "@/lib/services/stock.service";

type LowStockRow = {
  product_name: string;
  barcode: string;
  unit_name: string;
  location_name: string;
  qty_on_hand: number;
  min_stock_qty: number;
  stock_value: number;
  status: string;
};

export default async function Page() {
  const { data } = await StockService.getStockOnHand({ status: "Low Stock" });

  const rows: LowStockRow[] = (Array.isArray(data) ? data : []).map((r) => ({
    product_name: String(r.product_name ?? "-"),
    barcode: String(r.barcode ?? ""),
    unit_name: String(r.unit_name ?? ""),
    location_name: String(r.location_name ?? ""),
    qty_on_hand: Number(r.qty_on_hand ?? 0),
    min_stock_qty: Number(r.min_stock_qty ?? 0),
    stock_value: Number(r.stock_value ?? 0),
    status: String(r.status ?? "Low Stock")
  }));

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h5" fontWeight={800}>รายงานสินค้าใกล้หมด</Typography>
        <Typography color="text.secondary">ติดตามสินค้าที่ต่ำกว่าขั้นต่ำ พร้อมดูปริมาณที่ต้องเติมสต๊อก</Typography>
      </Stack>

      <LowStockReportClient rows={rows} />
    </Stack>
  );
}
