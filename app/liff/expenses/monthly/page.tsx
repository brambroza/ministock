"use client";

import { useEffect, useMemo, useState } from "react";
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
  TextField,
  Typography
} from "@mui/material";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ExpenseClaim = {
  id: string;
  expense_date: string;
  vendor_name: string | null;
  invoice_no: string | null;
  total_amount: number;
  payment_method: string | null;
};

type Payload = {
  month: string;
  summary: { total_expense?: number; total_claims?: number } | null;
  byVendor: { name: string; amount: number }[];
  byPayment: { name: string; amount: number }[];
  claims: ExpenseClaim[];
};

const PIE_COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#15803d", "#166534"];

function monthNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString();
}

export default function LiffMonthlyExpensePage() {
  const [month, setMonth] = useState(monthNow());
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/expenses/monthly-summary?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
        return;
      }
      setData(payload);
      setLoading(false);
    };
    load();
  }, [month]);

  const total = useMemo(() => Number(data?.summary?.total_expense ?? 0), [data]);
  const claimsCount = useMemo(() => Number(data?.summary?.total_claims ?? data?.claims?.length ?? 0), [data]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={800}>สรุปค่าใช้จ่ายรายเดือน</Typography>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 160 }} />
      </Stack>

      {error ? <Paper sx={{ p: 2, color: "error.main" }}>{error}</Paper> : null}
      {loading ? <Paper sx={{ p: 2 }}>กำลังโหลดข้อมูล...</Paper> : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Card sx={{ flex: 1, borderRadius: 2.5 }}><CardContent><Typography variant="body2" color="text.secondary">ยอดค่าใช้จ่ายรวม</Typography><Typography variant="h5" fontWeight={800}>{fmt(total)} บาท</Typography></CardContent></Card>
        <Card sx={{ flex: 1, borderRadius: 2.5 }}><CardContent><Typography variant="body2" color="text.secondary">จำนวนรายการ</Typography><Typography variant="h5" fontWeight={800}>{fmt(claimsCount)} รายการ</Typography></CardContent></Card>
      </Stack>

      <Card sx={{ borderRadius: 2.5 }}><CardContent>
        <Typography fontWeight={700} mb={1}>ค่าใช้จ่ายตามร้านค้า</Typography>
        <Box sx={{ width: "100%", height: 240 }}><ResponsiveContainer><BarChart data={data?.byVendor ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}><XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={70} fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v: number) => `${fmt(v)} บาท`} /><Bar dataKey="amount" fill="#16a34a" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></Box>
      </CardContent></Card>

      <Card sx={{ borderRadius: 2.5 }}><CardContent>
        <Typography fontWeight={700} mb={1}>สัดส่วนตามวิธีชำระเงิน</Typography>
        <Box sx={{ width: "100%", height: 240 }}><ResponsiveContainer><PieChart><Pie data={data?.byPayment ?? []} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={86}>{(data?.byPayment ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => `${fmt(v)} บาท`} /></PieChart></ResponsiveContainer></Box>
      </CardContent></Card>

      <Card sx={{ borderRadius: 2.5 }}><CardContent>
        <Typography fontWeight={700} mb={1}>รายการค่าใช้จ่าย</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>วันที่</TableCell><TableCell>ร้านค้า</TableCell><TableCell>เลขบิล</TableCell><TableCell align="right">ยอดรวม</TableCell><TableCell align="center">ชำระ</TableCell></TableRow></TableHead><TableBody>
          {(data?.claims ?? []).map((r) => <TableRow key={r.id} hover><TableCell>{r.expense_date}</TableCell><TableCell>{r.vendor_name || "-"}</TableCell><TableCell>{r.invoice_no || "-"}</TableCell><TableCell align="right">{fmt(r.total_amount)} บาท</TableCell><TableCell align="center"><Chip size="small" label={r.payment_method || "UNKNOWN"} /></TableCell></TableRow>)}
          {(data?.claims ?? []).length === 0 ? <TableRow><TableCell colSpan={5} align="center">ไม่พบข้อมูลเดือนนี้</TableCell></TableRow> : null}
        </TableBody></Table></TableContainer>
      </CardContent></Card>
    </Stack>
  );
}
