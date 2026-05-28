"use client";

import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type PurchaseRow = {
  product_name: string;
  total_received_qty: number;
  total_purchase_amount: number;
  avg_cost: number;
};

type Props = {
  monthLabel: string;
  rows: PurchaseRow[];
};

const PIE_COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#15803d", "#166534"]; 

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

export default function MonthlyPurchaseReportClient({ monthLabel, rows }: Props) {
  const sorted = [...rows].sort((a, b) => b.total_purchase_amount - a.total_purchase_amount);
  const top10 = sorted.slice(0, 10);
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_purchase_amount || 0), 0);
  const totalQty = rows.reduce((sum, r) => sum + Number(r.total_received_qty || 0), 0);

  const pieData = top10.slice(0, 6).map((r) => ({
    name: r.product_name,
    value: Number(r.total_purchase_amount || 0)
  }));

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">ยอดซื้อรวม ({monthLabel})</Typography>
            <Typography variant="h4" fontWeight={700}>{formatNumber(totalAmount)} บาท</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">จำนวนรับเข้ารวม</Typography>
            <Typography variant="h4" fontWeight={700}>{formatNumber(totalQty)}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Card sx={{ flex: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>Top 10 ยอดซื้อ (Bar Chart)</Typography>
            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={top10} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                  <XAxis dataKey="product_name" angle={-20} textAnchor="end" interval={0} height={70} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value)} บาท`} />
                  <Bar dataKey="total_purchase_amount" radius={[8, 8, 0, 0]} fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>สัดส่วนยอดซื้อ (Pie Chart)</Typography>
            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${formatNumber(value)} บาท`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>รายการยอดซื้อประจำเดือน</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>สินค้า</TableCell>
                  <TableCell align="right">จำนวนรับเข้า</TableCell>
                  <TableCell align="right">ยอดซื้อรวม</TableCell>
                  <TableCell align="right">ต้นทุนเฉลี่ย</TableCell>
                  <TableCell align="center">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.product_name} hover>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell align="right">{formatNumber(r.total_received_qty)}</TableCell>
                    <TableCell align="right">{formatNumber(r.total_purchase_amount)} บาท</TableCell>
                    <TableCell align="right">{formatNumber(r.avg_cost)} บาท</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={r.total_purchase_amount > 0 ? "มีรายการ" : "ไม่มีรายการ"}
                        color={r.total_purchase_amount > 0 ? "success" : "default"}
                        variant={r.total_purchase_amount > 0 ? "filled" : "outlined"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">ไม่พบข้อมูลรายงานในเดือนนี้</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}
