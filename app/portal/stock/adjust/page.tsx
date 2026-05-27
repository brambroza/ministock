"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
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
  Typography
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import dayjs from "dayjs";
import { AppSnackbar } from "@/components/common/AppSnackbar";

type AdjustRow = {
  id: string;
  movement_date: string;
  movement_type: "ADJUST_IN" | "ADJUST_OUT";
  qty_in: number;
  qty_out: number;
  balance_qty: number;
  reference_no: string | null;
  remark: string | null;
  products: { id: string; product_name: string; barcode: string }[] | null;
  storage_locations: { id: string; location_name: string }[] | null;
};

export default function Page() {
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<AdjustRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ direction: "IN", product_id: "", location_id: "", quantity: "", unit_cost: "", remark: "", reference_no: "" });
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
      const [pRes, lRes, aRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" }),
        fetch("/api/stock/adjust", { cache: "no-store" })
      ]);

      const [pData, lData, aData] = await Promise.all([pRes.json(), lRes.json(), aRes.json()]);

      if (!pRes.ok || !lRes.ok || !aRes.ok) {
        setError(pData?.error ?? lData?.error ?? aData?.error ?? "ไม่สามารถโหลดข้อมูลได้");
        return;
      }

      setProducts((Array.isArray(pData) ? pData : []).map((p: { id: string; product_name: string }) => ({ id: p.id, name: p.product_name })));
      setLocations((Array.isArray(lData) ? lData : []).map((l: { id: string; location_name: string }) => ({ id: l.id, name: l.location_name })));
      setRows(Array.isArray(aData) ? aData : []);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createAdjust = async () => {
    if (!form.product_id || !form.location_id || Number(form.quantity) <= 0 || !form.remark.trim()) {
      setSnack({ open: true, message: "กรุณากรอกข้อมูลให้ครบ (remark จำเป็น)", severity: "warning" });
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          direction: form.direction,
          product_id: form.product_id,
          location_id: form.location_id,
          quantity: Number(form.quantity),
          unit_cost: Number(form.unit_cost || 0),
          remark: form.remark,
          reference_no: form.reference_no || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "บันทึกรายการปรับสต๊อกไม่สำเร็จ", severity: "error" });
        return;
      }

      setSnack({ open: true, message: "บันทึกรายการปรับสต๊อกเรียบร้อย", severity: "success" });
      setForm({ direction: "IN", product_id: "", location_id: "", quantity: "", unit_cost: "", remark: "", reference_no: "" });
      await load();
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (row: AdjustRow) => {
    setEditingId(row.id);
    setEditForm({ reference_no: row.reference_no ?? "", remark: row.remark ?? "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/stock/adjust/${editingId}`, {
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
    const res = await fetch(`/api/stock/adjust/${id}`, { method: "DELETE" });
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
      <Typography variant="h5" fontWeight={700}>ปรับสต๊อก</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField select label="ทิศทาง" value={form.direction} onChange={(e) => setForm((s) => ({ ...s, direction: e.target.value }))}>
                <MenuItem value="IN">เพิ่ม (ADJUST_IN)</MenuItem>
                <MenuItem value="OUT">ลด (ADJUST_OUT)</MenuItem>
              </TextField>
              <TextField select label="สินค้า" value={form.product_id} onChange={(e) => setForm((s) => ({ ...s, product_id: e.target.value }))} fullWidth>
                {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
              <TextField select label="คลัง" value={form.location_id} onChange={(e) => setForm((s) => ({ ...s, location_id: e.target.value }))} fullWidth>
                {locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField label="จำนวน" type="number" value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} fullWidth />
              <TextField label="ต้นทุน/หน่วย" type="number" value={form.unit_cost} onChange={(e) => setForm((s) => ({ ...s, unit_cost: e.target.value }))} fullWidth />
              <TextField label="Reference No" value={form.reference_no} onChange={(e) => setForm((s) => ({ ...s, reference_no: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="หมายเหตุ (จำเป็น)" required value={form.remark} onChange={(e) => setForm((s) => ({ ...s, remark: e.target.value }))} fullWidth />
            <Button variant="contained" onClick={createAdjust} disabled={savingCreate || loading}>
              {savingCreate ? "กำลังบันทึก..." : "บันทึกรายการปรับสต๊อก"}
            </Button>
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
                  <Chip size="small" color={r.movement_type === "ADJUST_IN" ? "success" : "warning"} label={r.movement_type === "ADJUST_IN" ? "เพิ่ม" : "ลด"} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{dayjs(r.movement_date).format("DD/MM/YYYY HH:mm")}</Typography>
                <Typography variant="body2">จำนวน: {Number(r.qty_in || r.qty_out).toLocaleString()}</Typography>
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
              <TableCell>ประเภท</TableCell>
              <TableCell align="right">จำนวน</TableCell>
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
                <TableCell>
                  <Chip size="small" color={r.movement_type === "ADJUST_IN" ? "success" : "warning"} label={r.movement_type === "ADJUST_IN" ? "เพิ่ม" : "ลด"} />
                </TableCell>
                <TableCell align="right">{Number(r.qty_in || r.qty_out).toLocaleString()}</TableCell>
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
