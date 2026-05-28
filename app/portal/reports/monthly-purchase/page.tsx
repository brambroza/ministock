import dayjs from "dayjs";
import { Stack, Typography } from "@mui/material";
import MonthlyPurchaseReportClient from "./MonthlyPurchaseReportClient";
import { AuthService } from "@/lib/services/auth.service";
import { StockService } from "@/lib/services/stock.service";

type PurchaseRow = {
  product_name: string;
  total_received_qty: number;
  total_purchase_amount: number;
  avg_cost: number;
};

export default async function Page() {
  const companyId = await AuthService.getCurrentCompany();
  const month = dayjs().format("YYYY-MM-01");
  const monthLabel = dayjs(month).format("MM/YYYY");

  const { data } = companyId
    ? await StockService.getMonthlyPurchaseSummary(month, companyId)
    : { data: [] };

  const rows: PurchaseRow[] = (Array.isArray(data) ? data : []).map((r) => ({
    product_name: String(r.product_name ?? "-"),
    total_received_qty: Number(r.total_received_qty ?? 0),
    total_purchase_amount: Number(r.total_purchase_amount ?? 0),
    avg_cost: Number(r.avg_cost ?? 0)
  }));

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h5" fontWeight={800}>รายงานยอดซื้อประจำเดือน</Typography>
        <Typography color="text.secondary">ภาพรวมยอดรับเข้าและมูลค่าซื้อสินค้า เดือน {monthLabel}</Typography>
      </Stack>

      <MonthlyPurchaseReportClient monthLabel={monthLabel} rows={rows} />
    </Stack>
  );
}
