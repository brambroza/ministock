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

type BalanceRow = {
  product_name: string;
  opening_balance: number;
  total_in: number;
  total_out: number;
  ending_balance: number;
  ending_stock_value: number;
};

type Props = {
  monthLabel: string;
  rows: BalanceRow[];
};

const PIE_COLORS = ["#0ea5e9", "#38bdf8", "#7dd3fc", "#0284c7", "#0369a1", "#075985"];

function fmt(n: number) {
  return Number(n || 0).toLocaleString();
}

export default function MonthlyBalanceReportClient({ monthLabel, rows }: Props) {
  const sortedByValue = [...rows].sort((a, b) => b.ending_stock_value - a.ending_stock_value);
  const top10 = sortedByValue.slice(0, 10);
  const pieData = sortedByValue.slice(0, 6).map((r) => ({ name: r.product_name, value: r.ending_stock_value }));

  const totalOpening = rows.reduce((s, r) => s + r.opening_balance, 0);
  const totalIn = rows.reduce((s, r) => s + r.total_in, 0);
  const totalOut = rows.reduce((s, r) => s + r.total_out, 0);
  const totalEndingValue = rows.reduce((s, r) => s + r.ending_stock_value, 0);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">มูลค่าสต๊อกปลายเดือน ({monthLabel})</Typography>
            <Typography variant="h4" fontWeight={700}>{fmt(totalEndingValue)} บาท</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">ยอดยกมา / รับเข้า / จ่ายออก</Typography>
            <Typography variant="h6" fontWeight={700}>{fmt(totalOpening)} / {fmt(totalIn)} / {fmt(totalOut)}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Card sx={{ flex: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>Top 10 มูลค่าสต๊อกปลายเดือน (Bar Chart)</Typography>
            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={top10} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                  <XAxis dataKey="product_name" angle={-20} textAnchor="end" interval={0} height={70} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => `${fmt(v)} บาท`} />
                  <Bar dataKey="ending_stock_value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>สัดส่วนมูลค่าสต๊อก (Pie Chart)</Typography>
            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${fmt(v)} บาท`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>รายการคงเหลือรายสินค้า</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>สินค้า</TableCell>
                  <TableCell align="right">ยอดยกมา</TableCell>
                  <TableCell align="right">รับเข้า</TableCell>
                  <TableCell align="right">จ่ายออก</TableCell>
                  <TableCell align="right">คงเหลือปลายเดือน</TableCell>
                  <TableCell align="right">มูลค่าคงเหลือ</TableCell>
                  <TableCell align="center">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.product_name} hover>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell align="right">{fmt(r.opening_balance)}</TableCell>
                    <TableCell align="right">{fmt(r.total_in)}</TableCell>
                    <TableCell align="right">{fmt(r.total_out)}</TableCell>
                    <TableCell align="right">{fmt(r.ending_balance)}</TableCell>
                    <TableCell align="right">{fmt(r.ending_stock_value)} บาท</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={r.ending_balance > 0 ? "ปกติ" : "หมด"}
                        color={r.ending_balance > 0 ? "success" : "error"}
                        variant={r.ending_balance > 0 ? "filled" : "outlined"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">ไม่พบข้อมูลรายงานในเดือนนี้</TableCell>
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
