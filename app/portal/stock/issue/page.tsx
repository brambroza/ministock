"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import dayjs from "dayjs";
import { AppSnackbar } from "@/components/common/AppSnackbar";
import { BarcodeScanner } from "@/components/stock/BarcodeScanner";

type IssueRow = {
  id: string;
  movement_date: string;
  movement_type: "ISSUE";
  qty_in: number;
  qty_out: number;
  balance_qty: number;
  reference_no: string | null;
  remark: string | null;
  products: { id: string; product_name: string; barcode: string }[] | null;
  storage_locations: { id: string; location_name: string }[] | null;
};

export default function Page() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [products, setProducts] = useState<Array<{ id: string; name: string; barcode: string; storage_location_id?: string | null; cost?: number | null; unit_name?: string | null }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<IssueRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ product_id: "", location_id: "", quantity: "", unit_cost: "", remark: "", reference_no: "" });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{ product_id?: string; location_id?: string; quantity?: string }>({});
  const [savingCreate, setSavingCreate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reference_no: "", remark: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
    open: false,
    message: "",
    severity: "info"
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, lRes, iRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" }),
        fetch("/api/stock/issue", { cache: "no-store" })
      ]);

      const [pData, lData, iData] = await Promise.all([pRes.json(), lRes.json(), iRes.json()]);

      if (!pRes.ok || !lRes.ok || !iRes.ok) {
        setError(pData?.error ?? lData?.error ?? iData?.error ?? "ไม่สามารถโหลดข้อมูลได้");
        return;
      }

      setProducts(
        (Array.isArray(pData) ? pData : []).map(
          (p: { id: string; product_name: string; barcode: string; storage_location_id?: string | null; cost?: number | null; units?: { unit_name?: string }[] | null }) => ({
            id: p.id,
            name: p.product_name,
            barcode: p.barcode,
            storage_location_id: p.storage_location_id ?? null,
            cost: p.cost ?? null,
            unit_name: p.units?.[0]?.unit_name ?? null
          })
        )
      );
      setLocations((Array.isArray(lData) ? lData : []).map((l: { id: string; location_name: string }) => ({ id: l.id, name: l.location_name })));
      setRows(Array.isArray(iData) ? iData : []);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDetected = async (value: string) => {
    const code = value.trim();
    if (!code) return;
    setScanCode(code);

    let picked = products.find((p) => p.barcode === code);
    if (!picked) {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await res.json().catch(() => []);
      if (Array.isArray(data) && data.length > 0) {
        const p = data[0] as { id: string; product_name: string; barcode: string; storage_location_id?: string | null; cost?: number | null };
        picked = { id: p.id, name: p.product_name, barcode: p.barcode, storage_location_id: p.storage_location_id ?? null, cost: p.cost ?? null, unit_name: null };
      }
    }

    if (!picked) {
      setSnack({ open: true, message: "ไม่พบสินค้าจากโค้ดนี้", severity: "warning" });
      return;
    }

    setForm((s) => ({
      ...s,
      product_id: picked.id,
      location_id: picked.storage_location_id ?? s.location_id,
      unit_cost: String(picked.cost ?? s.unit_cost ?? ""),
      quantity: s.quantity || "1"
    }));
    if (isMobile) setMobileFormOpen(true);
    setScannerOpen(false);
    setSnack({ open: true, message: `เลือกสินค้าแล้ว: ${picked.name}`, severity: "success" });
  };

  const createIssue = async () => {
    const nextErrors: { product_id?: string; location_id?: string; quantity?: string } = {};
    if (!form.product_id) nextErrors.product_id = "กรุณาเลือกสินค้า";
    if (!form.location_id) nextErrors.location_id = "กรุณาเลือกคลัง";
    if (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) nextErrors.quantity = "จำนวนต้องมากกว่า 0";

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSnack({ open: true, message: "กรุณากรอกข้อมูลบังคับให้ครบก่อนบันทึก", severity: "warning" });
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch("/api/stock/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product_id: form.product_id,
          location_id: form.location_id,
          quantity: Number(form.quantity),
          unit_cost: Number(form.unit_cost || 0),
          remark: form.remark || null,
          reference_no: form.reference_no || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "บันทึกรายการเบิกไม่สำเร็จ", severity: "error" });
        return;
      }

      setSnack({ open: true, message: "บันทึกรายการเบิกเรียบร้อย", severity: "success" });
      setForm({ product_id: "", location_id: "", quantity: "", unit_cost: "", remark: "", reference_no: "" });
      await load();
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (row: IssueRow) => {
    setEditingId(row.id);
    setEditForm({ reference_no: row.reference_no ?? "", remark: row.remark ?? "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/stock/issue/${editingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "แก้ไขไม่สำเร็จ", severity: "error" });
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...data } : r)));
      setEditingId(null);
      setSnack({ open: true, message: "แก้ไขเรียบร้อย", severity: "success" });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRow = async (id: string) => {
    const res = await fetch(`/api/stock/issue/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setSnack({ open: true, message: data?.error ?? "ลบไม่สำเร็จ", severity: "error" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSnack({ open: true, message: "ลบรายการเรียบร้อย", severity: "success" });
  };

  const pagedRows = useMemo(() => {
    if (rowsPerPage === -1) return rows;
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>เบิกออกสินค้า</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField label="สแกนโค้ดสินค้า" value={scanCode} onChange={(e) => setScanCode(e.target.value)} fullWidth />
              <Button variant={scannerOpen ? "outlined" : "contained"} onClick={() => setScannerOpen((s) => !s)}>
                {scannerOpen ? "ซ่อนสแกนเนอร์" : "สแกน Barcode/QR/ถ่ายรูป"}
              </Button>
            </Stack>

            <Button
              variant="text"
              onClick={() => setMobileFormOpen((v) => !v)}
              sx={{ display: { xs: "inline-flex", md: "none" }, alignSelf: "flex-start" }}
            >
              {mobileFormOpen ? "ซ่อนตัวเลือก" : "แสดงตัวเลือก"}
            </Button>

            {scannerOpen ? (
              <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent>
                  <BarcodeScanner onDetected={onDetected} />
                </CardContent>
              </Card>
            ) : null}

            <Collapse in={!isMobile || mobileFormOpen}>
              <Stack spacing={1.2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                  <TextField
                    select
                    label="สินค้า *"
                    value={form.product_id}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, product_id: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, product_id: undefined }));
                    }}
                    error={Boolean(formErrors.product_id)}
                    helperText={formErrors.product_id}
                    fullWidth
                  >
                    {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </TextField>
                  <TextField
                    select
                    label="คลัง *"
                    value={form.location_id}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, location_id: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, location_id: undefined }));
                    }}
                    error={Boolean(formErrors.location_id)}
                    helperText={formErrors.location_id}
                    fullWidth
                  >
                    {locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                  </TextField>
                  <TextField
                    label="จำนวน *"
                    type="number"
                    value={form.quantity}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, quantity: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, quantity: undefined }));
                    }}
                    error={Boolean(formErrors.quantity)}
                    helperText={formErrors.quantity}
                    fullWidth
                  />
                </Stack>
                {form.product_id ? (
                  <Chip
                    color="info"
                    label={`หน่วย: ${products.find((p) => p.id === form.product_id)?.unit_name ?? "-"} | คลังตั้งต้น: ${locations.find((l) => l.id === (products.find((p) => p.id === form.product_id)?.storage_location_id ?? ""))?.name ?? "-"}`}
                  />
                ) : null}
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                  <TextField label="ต้นทุน/หน่วย" type="number" value={form.unit_cost} onChange={(e) => setForm((s) => ({ ...s, unit_cost: e.target.value }))} fullWidth />
                  <TextField label="Reference No" value={form.reference_no} onChange={(e) => setForm((s) => ({ ...s, reference_no: e.target.value }))} fullWidth />
                  <TextField label="หมายเหตุ" value={form.remark} onChange={(e) => setForm((s) => ({ ...s, remark: e.target.value }))} fullWidth />
                </Stack>
                <Button variant="contained" onClick={createIssue} disabled={savingCreate || loading}>
                  {savingCreate ? "กำลังบันทึก..." : "บันทึกรายการเบิก"}
                </Button>
              </Stack>
            </Collapse>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={1.2} sx={{ display: { xs: "block", md: "none" } }}>
        {pagedRows.map((r) => (
          <Card key={r.id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={700}>{r.products?.[0]?.product_name ?? "-"}</Typography>
                  <Chip size="small" color="warning" label="เบิกออก" />
                </Stack>
                <Typography variant="body2" color="text.secondary">{dayjs(r.movement_date).format("DD/MM/YYYY HH:mm")}</Typography>
                <Typography variant="body2">จำนวน: {Number(r.qty_out).toLocaleString()}</Typography>
                {editingId === r.id ? (
                  <>
                    <TextField size="small" label="Reference" value={editForm.reference_no} onChange={(e) => setEditForm((s) => ({ ...s, reference_no: e.target.value }))} />
                    <TextField size="small" label="หมายเหตุ" value={editForm.remark} onChange={(e) => setEditForm((s) => ({ ...s, remark: e.target.value }))} />
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" onClick={saveEdit} disabled={savingEdit} startIcon={<SaveRoundedIcon />}>บันทึก</Button>
                      <Button size="small" variant="outlined" onClick={() => setEditingId(null)} startIcon={<CancelRoundedIcon />}>ยกเลิก</Button>
                    </Stack>
                  </>
                ) : (
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <IconButton size="small" onClick={() => startEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteRow(r.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Paper elevation={0} sx={{ display: { xs: "none", md: "block" }, border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>วันที่</TableCell>
              <TableCell>สินค้า</TableCell>
              <TableCell>คลัง</TableCell>
              <TableCell align="right">จำนวนเบิก</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>หมายเหตุ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{dayjs(r.movement_date).format("DD/MM/YYYY HH:mm")}</TableCell>
                <TableCell>{r.products?.[0]?.product_name ?? "-"}</TableCell>
                <TableCell>{r.storage_locations?.[0]?.location_name ?? "-"}</TableCell>
                <TableCell align="right">{Number(r.qty_out).toLocaleString()}</TableCell>
                <TableCell width={180}>
                  {editingId === r.id ? <TextField size="small" value={editForm.reference_no} onChange={(e) => setEditForm((s) => ({ ...s, reference_no: e.target.value }))} /> : (r.reference_no ?? "-")}
                </TableCell>
                <TableCell width={260}>
                  {editingId === r.id ? <TextField size="small" fullWidth value={editForm.remark} onChange={(e) => setEditForm((s) => ({ ...s, remark: e.target.value }))} /> : (r.remark ?? "-")}
                </TableCell>
                <TableCell align="right" width={160}>
                  {editingId === r.id ? (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" color="primary" onClick={saveEdit} disabled={savingEdit}><SaveRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => setEditingId(null)}><CancelRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => startEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteRow(r.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage === -1 ? rows.length || 1 : rowsPerPage}
          onRowsPerPageChange={(e) => {
            const v = Number(e.target.value);
            setRowsPerPage(v);
            setPage(0);
          }}
          rowsPerPageOptions={[
            { label: "10", value: 10 },
            { label: "15", value: 15 },
            { label: "25", value: 25 },
            { label: "ทั้งหมด", value: -1 }
          ]}
          labelRowsPerPage="แถวต่อหน้า"
        />
      </Paper>

      <AppSnackbar open={snack.open} message={snack.message} severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} />
    </Stack>
  );
}
