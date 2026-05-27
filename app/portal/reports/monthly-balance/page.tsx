import dayjs from "dayjs";
import { Card, CardContent, Typography } from "@mui/material";
import { AuthService } from "@/lib/services/auth.service";
import { StockService } from "@/lib/services/stock.service";
export default async function Page() {
  const companyId = await AuthService.getCurrentCompany();
  const { data } = companyId ? await StockService.getMonthlyBalanceSummary(dayjs().format("YYYY-MM-01"), companyId) : { data: [] };
  return <Card><CardContent><Typography variant="h5">รายงานคงเหลือประจำเดือน</Typography><pre>{JSON.stringify(data, null, 2)}</pre></CardContent></Card>;
}
