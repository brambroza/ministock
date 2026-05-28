import dayjs from "dayjs";
import { Stack, Typography } from "@mui/material";
import MonthlyBalanceReportClient from "./MonthlyBalanceReportClient";
import { AuthService } from "@/lib/services/auth.service";
import { StockService } from "@/lib/services/stock.service";

type RawRow = Record<string, unknown>;

type BalanceRow = {
  product_name: string;
  opening_balance: number;
  total_in: number;
  total_out: number;
  ending_balance: number;
  ending_stock_value: number;
};

const toNum = (v: unknown) => Number(v ?? 0);

export default async function Page() {
  const companyId = await AuthService.getCurrentCompany();
  const month = dayjs().format("YYYY-MM-01");
  const monthLabel = dayjs(month).format("MM/YYYY");

  const { data } = companyId
    ? await StockService.getMonthlyBalanceSummary(month, companyId)
    : { data: [] };

  const rows: BalanceRow[] = (Array.isArray(data) ? data : []).map((r) => {
    const row = r as RawRow;
    return {
      product_name: String(row.product_name ?? "-"),
      opening_balance: toNum(row.opening_balance ?? row.opening_qty),
      total_in: toNum(row.total_in ?? row.qty_in),
      total_out: toNum(row.total_out ?? row.qty_out),
      ending_balance: toNum(row.ending_balance ?? row.ending_qty),
      ending_stock_value: toNum(row.ending_stock_value ?? row.stock_value)
    };
  });

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h5" fontWeight={800}>รายงานคงเหลือประจำเดือน</Typography>
        <Typography color="text.secondary">สรุปยอดยกมา รับเข้า จ่ายออก และมูลค่าคงเหลือ เดือน {monthLabel}</Typography>
      </Stack>

      <MonthlyBalanceReportClient monthLabel={monthLabel} rows={rows} />
    </Stack>
  );
}
