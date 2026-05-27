/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import { AppSnackbar } from "@/components/common/AppSnackbar";

type Parsed = {
  vendor_name: string;
  tax_id: string;
  invoice_no: string;
  expense_date: string;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string;
  remark: string;
  confidence_score: number;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  vendor_name: string | null;
  invoice_no: string | null;
  total_amount: number;
  payment_method: string | null;
  category: string | null;
  remark: string | null;
  created_at: string;
};

export default function Page() {
  const [docId, setDocId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duplicate, setDuplicate] = useState<null | "FILE_HASH" | "FINGERPRINT">(null);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [saving, setSaving] = useState(false);

  const [parsed, setParsed] = useState<Parsed>({
    vendor_name: "",
    tax_id: "",
    invoice_no: "",
    expense_date: new Date().toISOString().slice(0, 10),
    subtotal_amount: 0,
    vat_amount: 0,
    total_amount: 0,
    payment_method: "UNKNOWN",
    remark: "",
    confidence_score: 0
  });

  const [recent, setRecent] = useState<ExpenseRow[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
    open: false,
    message: "",
    severity: "info"
  });

  const confidenceColor = useMemo(() => {
    if (parsed.confidence_score >= 85) return "success" as const;
    if (parsed.confidence_score >= 65) return "warning" as const;
    return "error" as const;
  }, [parsed.confidence_score]);

  useEffect(() => {
    void loadRecent();
  }, []);

  const loadRecent = async () => {
    const res = await fetch("/api/expenses", { cache: "no-store" });
    const data = await res.json();
    if (res.ok && Array.isArray(data)) setRecent(data);
  };

  const uploadAndOCR = async (file: File) => {
    setLoadingOCR(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/expenses/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "OCR ไม่สำเร็จ", severity: "error" });
        return;
      }

      setDocId(data.documentId ?? "");
      setImageUrl(data.imageUrl ?? "");
      setDuplicate((data.duplicateType as "FILE_HASH" | "FINGERPRINT" | null) ?? null);
      if (data.parsed) {
        setParsed((p) => ({ ...p, ...(data.parsed as Partial<Parsed>) }));
      }
      setSnack({ open: true, message: "อ่านบิลสำเร็จ กรุณาตรวจสอบข้อมูลก่อนบันทึก", severity: "success" });
    } finally {
      setLoadingOCR(false);
    }
  };

  const saveExpense = async () => {
    if (!docId) {
      setSnack({ open: true, message: "ยังไม่มีเอกสารที่สแกน", severity: "warning" });
      return;
    }
    if (!parsed.expense_date || Number(parsed.total_amount) <= 0) {
      setSnack({ open: true, message: "กรุณากรอกวันที่และยอดรวมให้ถูกต้อง", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          vendor_name: parsed.vendor_name || null,
          tax_id: parsed.tax_id || null,
          invoice_no: parsed.invoice_no || null,
          expense_date: parsed.expense_date,
          subtotal_amount: Number(parsed.subtotal_amount || 0),
          vat_amount: Number(parsed.vat_amount || 0),
          total_amount: Number(parsed.total_amount || 0),
          payment_method: parsed.payment_method || "UNKNOWN",
          category: "GENERAL",
          remark: parsed.remark || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "บันทึกค่าใช้จ่ายไม่สำเร็จ", severity: "error" });
        return;
      }

      setSnack({ open: true, message: "บันทึกรายการจ่ายเรียบร้อย", severity: "success" });
      await loadRecent();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>สแกนบิลค่าใช้จ่าย (OCR)</Typography>

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.2}>
            <Button component="label" variant="contained" startIcon={<CloudUploadRoundedIcon />} disabled={loadingOCR}>
              {loadingOCR ? "กำลังอัปโหลดและอ่าน OCR..." : "สแกนบิลค่าใช้จ่าย"}
              <input
                hidden
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAndOCR(file);
                }}
              />
            </Button>

            {duplicate === "FILE_HASH" ? <Alert severity="warning">พบไฟล์บิลซ้ำกับที่เคยสแกนแล้ว</Alert> : null}
            {duplicate === "FINGERPRINT" ? <Alert severity="warning">ระบบพบข้อมูลบิลซ้ำ (ร้าน/เลขบิล/วันที่/ยอด) กรุณาตรวจสอบก่อนบันทึก</Alert> : null}

            {imageUrl ? <img src={imageUrl} alt="bill" style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 12, border: "1px solid #e5e7eb" }} /> : null}
            <Chip size="small" color={confidenceColor} label={`OCR confidence: ${Number(parsed.confidence_score || 0).toFixed(0)}%`} />
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Typography fontWeight={700}>ข้อมูลค่าใช้จ่าย (แก้ไขได้ก่อนบันทึก)</Typography>
          <Divider sx={{ my: 1.2 }} />
          <Stack spacing={1.2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField label="ร้านค้า" value={parsed.vendor_name} onChange={(e) => setParsed((s) => ({ ...s, vendor_name: e.target.value }))} fullWidth />
              <TextField label="Tax ID" value={parsed.tax_id} onChange={(e) => setParsed((s) => ({ ...s, tax_id: e.target.value }))} fullWidth />
              <TextField label="เลขที่บิล" value={parsed.invoice_no} onChange={(e) => setParsed((s) => ({ ...s, invoice_no: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField label="วันที่จ่าย" type="date" value={parsed.expense_date} onChange={(e) => setParsed((s) => ({ ...s, expense_date: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="ยอดก่อน VAT" type="number" value={parsed.subtotal_amount} onChange={(e) => setParsed((s) => ({ ...s, subtotal_amount: Number(e.target.value) }))} fullWidth />
              <TextField label="VAT" type="number" value={parsed.vat_amount} onChange={(e) => setParsed((s) => ({ ...s, vat_amount: Number(e.target.value) }))} fullWidth />
              <TextField label="ยอดรวม" type="number" value={parsed.total_amount} onChange={(e) => setParsed((s) => ({ ...s, total_amount: Number(e.target.value) }))} fullWidth />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField label="วิธีจ่าย" value={parsed.payment_method} onChange={(e) => setParsed((s) => ({ ...s, payment_method: e.target.value }))} fullWidth />
              <TextField label="หมายเหตุ" value={parsed.remark} onChange={(e) => setParsed((s) => ({ ...s, remark: e.target.value }))} fullWidth />
            </Stack>
            <Box>
              <Button variant="contained" onClick={saveExpense} disabled={saving || loadingOCR}>{saving ? "กำลังบันทึก..." : "บันทึกค่าใช้จ่าย"}</Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>วันที่</TableCell>
              <TableCell>ร้านค้า</TableCell>
              <TableCell>เลขที่บิล</TableCell>
              <TableCell align="right">ยอดรวม</TableCell>
              <TableCell>วิธีจ่าย</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recent.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.expense_date}</TableCell>
                <TableCell>{r.vendor_name ?? "-"}</TableCell>
                <TableCell>{r.invoice_no ?? "-"}</TableCell>
                <TableCell align="right">{Number(r.total_amount).toLocaleString()}</TableCell>
                <TableCell>{r.payment_method ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <AppSnackbar open={snack.open} message={snack.message} severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} />
    </Stack>
  );
}
