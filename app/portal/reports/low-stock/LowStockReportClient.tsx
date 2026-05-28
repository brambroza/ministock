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

type Props = {
  rows: LowStockRow[];
};

const PIE_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#f97316", "#ea580c", "#facc15"];

function fmt(n: number) {
  return Number(n || 0).toLocaleString();
}

export default function LowStockReportClient({ rows }: Props) {
  const sortedGap = [...rows].sort((a, b) => (b.min_stock_qty - b.qty_on_hand) - (a.min_stock_qty - a.qty_on_hand));
  const top10Gap = sortedGap.slice(0, 10).map((r) => ({
    product_name: r.product_name,
    gap: Math.max(r.min_stock_qty - r.qty_on_hand, 0)
  }));

  const pieData = rows
    .slice()
    .sort((a, b) => b.stock_value - a.stock_value)
    .slice(0, 6)
    .map((r) => ({ name: r.product_name, value: r.stock_value }));

  const totalItems = rows.length;
  const totalShortQty = rows.reduce((s, r) => s + Math.max(r.min_stock_qty - r.qty_on_hand, 0), 0);
  const totalStockValue = rows.reduce((s, r) => s + Number(r.stock_value || 0), 0);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">สินค้าใกล้หมดทั้งหมด</Typography>
            <Typography variant="h4" fontWeight={700}>{fmt(totalItems)} รายการ</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">จำนวนที่ขาดจากขั้นต่ำรวม</Typography>
            <Typography variant="h4" fontWeight={700}>{fmt(totalShortQty)}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">มูลค่าสต๊อกของกลุ่มใกล้หมด</Typography>
            <Typography variant="h4" fontWeight={700}>{fmt(totalStockValue)} บาท</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Card sx={{ flex: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>Top 10 สินค้าขาดจากขั้นต่ำ (Bar Chart)</Typography>
            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={top10Gap} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                  <XAxis dataKey="product_name" angle={-20} textAnchor="end" interval={0} height={70} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => `${fmt(v)} หน่วย`} />
                  <Bar dataKey="gap" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={1}>สัดส่วนมูลค่า (Pie Chart)</Typography>
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
          <Typography variant="h6" fontWeight={700} mb={1}>รายการสินค้าใกล้หมด</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>สินค้า</TableCell>
                  <TableCell>บาร์โค้ด</TableCell>
                  <TableCell>คลัง</TableCell>
                  <TableCell align="right">คงเหลือ</TableCell>
                  <TableCell align="right">ขั้นต่ำ</TableCell>
                  <TableCell align="right">มูลค่า</TableCell>
                  <TableCell align="center">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.product_name}-${r.location_name}-${r.barcode}`} hover>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell>{r.barcode || "-"}</TableCell>
                    <TableCell>{r.location_name || "-"}</TableCell>
                    <TableCell align="right">{fmt(r.qty_on_hand)} {r.unit_name || ""}</TableCell>
                    <TableCell align="right">{fmt(r.min_stock_qty)}</TableCell>
                    <TableCell align="right">{fmt(r.stock_value)} บาท</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={r.status === "Out of Stock" ? "หมด" : "ใกล้หมด"}
                        color={r.status === "Out of Stock" ? "error" : "warning"}
                        variant="filled"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">ไม่พบข้อมูลสินค้าใกล้หมด</TableCell>
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
