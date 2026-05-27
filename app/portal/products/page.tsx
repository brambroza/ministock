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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { AppSnackbar } from "@/components/common/AppSnackbar";
import { PageHeader } from "@/components/common/Common";

type ProductRow = {
  id: string;
  barcode: string;
  sku: string | null;
  product_name: string;
  unit_id: string;
  price: number;
  cost: number;
  storage_location_id: string | null;
  min_stock_qty: number;
  active: boolean;
  image_url: string | null;
};

type UnitOption = { id: string; unit_name: string; unit_code: string };
type LocationOption = { id: string; location_name: string; location_code: string };

const emptyForm = {
  barcode: "",
  sku: "",
  product_name: "",
  unit_id: "",
  price: "0",
  cost: "0",
  storage_location_id: "",
  min_stock_qty: "0",
  opening_balance: "0",
  image_url: "",
  active: true
};

export default function Page() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
    open: false,
    message: "",
    severity: "info"
  });

  const load = async () => {
    setError("");
    try {
      const [pRes, uRes, lRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/units", { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" })
      ]);
      const [pData, uData, lData] = await Promise.all([pRes.json(), uRes.json(), lRes.json()]);
      if (!pRes.ok || !uRes.ok || !lRes.ok) {
        setError(pData?.error ?? uData?.error ?? lData?.error ?? "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setRows(Array.isArray(pData) ? pData : []);
      setUnits(Array.isArray(uData) ? uData : []);
      setLocations(Array.isArray(lData) ? lData : []);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      // no-op
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.product_name.toLowerCase().includes(q) || r.barcode.toLowerCase().includes(q) || (r.sku ?? "").toLowerCase().includes(q));
  }, [rows, keyword]);

  const paged = useMemo(() => {
    if (rowsPerPage === -1) return filtered;
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: ProductRow) => {
    setEditingId(row.id);
    setForm({
      barcode: row.barcode,
      sku: row.sku ?? "",
      product_name: row.product_name,
      unit_id: row.unit_id,
      price: String(row.price ?? 0),
      cost: String(row.cost ?? 0),
      storage_location_id: row.storage_location_id ?? "",
      min_stock_qty: String(row.min_stock_qty ?? 0),
      opening_balance: "0",
      image_url: row.image_url ?? "",
      active: Boolean(row.active)
    });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/products/upload-image${editingId ? `?productId=${editingId}` : ""}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "อัปโหลดรูปไม่สำเร็จ");
      setForm((s) => ({ ...s, image_url: data.publicUrl ?? "" }));
    } catch (e) {
      setSnack({ open: true, message: (e as Error).message, severity: "error" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.barcode.trim() || !form.product_name.trim() || !form.unit_id) {
      setSnack({ open: true, message: "กรุณากรอกข้อมูลบังคับให้ครบ", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        barcode: form.barcode.trim(),
        sku: form.sku.trim() || null,
        product_name: form.product_name.trim(),
        unit_id: form.unit_id,
        price: Number(form.price || 0),
        cost: Number(form.cost || 0),
        storage_location_id: form.storage_location_id || null,
        min_stock_qty: Number(form.min_stock_qty || 0),
        opening_balance: Number(form.opening_balance || 0),
        image_url: form.image_url || null,
        active: form.active
      };

      const res = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "บันทึกไม่สำเร็จ", severity: "error" });
        return;
      }

      setSnack({ open: true, message: editingId ? "แก้ไขสินค้าเรียบร้อย" : "เพิ่มสินค้าเรียบร้อย", severity: "success" });
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setSnack({ open: true, message: data?.error ?? "ลบไม่สำเร็จ", severity: "error" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSnack({ open: true, message: "ลบสินค้าเรียบร้อย", severity: "success" });
  };

  return (
    <Stack spacing={2}>
      <PageHeader title="สินค้า" subtitle="จัดการข้อมูลสินค้า" />
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField label="ค้นหา (ชื่อ/บาร์โค้ด/SKU)" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} fullWidth />
          <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={openCreate}>เพิ่มสินค้า</Button>
        </Stack>
      </Paper>

      <Stack spacing={1.2} sx={{ display: { xs: "flex", md: "none" } }}>
        {paged.map((r) => (
          <Card key={r.id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
            <CardContent>
              <Stack direction="row" spacing={1.2}>
                <img src={r.image_url ?? "https://placehold.co/72x72?text=No+Image"} alt={r.product_name} style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }} />
                <Box flex={1}>
                  <Typography fontWeight={700}>{r.product_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{r.barcode}</Typography>
                  <Typography variant="body2">ราคา {Number(r.price ?? 0).toLocaleString()} บาท</Typography>
                  <Stack direction="row" spacing={0.5} mt={0.5}>
                    <Chip size="small" label={r.active ? "ใช้งาน" : "ไม่ใช้งาน"} color={r.active ? "success" : "default"} />
                  </Stack>
                </Box>
              </Stack>
              <Stack direction="row" justifyContent="flex-end" spacing={0.5} mt={1}>
                <IconButton size="small" onClick={() => openEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => remove(r.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Paper elevation={0} sx={{ display: { xs: "none", md: "block" }, border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รูป</TableCell>
              <TableCell>สินค้า</TableCell>
              <TableCell>บาร์โค้ด</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">ราคา</TableCell>
              <TableCell align="right">ต้นทุน</TableCell>
              <TableCell align="right">ขั้นต่ำ</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell><img src={r.image_url ?? "https://placehold.co/48x48?text=-"} alt={r.product_name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid #e5e7eb" }} /></TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.barcode}</TableCell>
                <TableCell>{r.sku ?? "-"}</TableCell>
                <TableCell align="right">{Number(r.price ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.cost ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.min_stock_qty ?? 0).toLocaleString()}</TableCell>
                <TableCell><Chip size="small" label={r.active ? "ใช้งาน" : "ไม่ใช้งาน"} color={r.active ? "success" : "default"} /></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => remove(r.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage === -1 ? filtered.length || 1 : rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} mt={0.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField label="บาร์โค้ด *" value={form.barcode} onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))} fullWidth />
              <TextField label="SKU" value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} fullWidth />
              <TextField label="ชื่อสินค้า *" value={form.product_name} onChange={(e) => setForm((s) => ({ ...s, product_name: e.target.value }))} fullWidth />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField select label="หน่วยนับ *" value={form.unit_id} onChange={(e) => setForm((s) => ({ ...s, unit_id: e.target.value }))} fullWidth>
                {units.map((u) => <MenuItem key={u.id} value={u.id}>{u.unit_code} - {u.unit_name}</MenuItem>)}
              </TextField>
              <TextField select label="คลังเริ่มต้น" value={form.storage_location_id} onChange={(e) => setForm((s) => ({ ...s, storage_location_id: e.target.value }))} fullWidth>
                <MenuItem value="">-</MenuItem>
                {locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.location_code} - {l.location_name}</MenuItem>)}
              </TextField>
              <TextField select label="สถานะ" value={String(form.active)} onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === "true" }))} fullWidth>
                <MenuItem value="true">ใช้งาน</MenuItem>
                <MenuItem value="false">ไม่ใช้งาน</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
              <TextField label="ราคาขาย" type="number" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} fullWidth />
              <TextField label="ต้นทุน" type="number" value={form.cost} onChange={(e) => setForm((s) => ({ ...s, cost: e.target.value }))} fullWidth />
              <TextField label="สต๊อกขั้นต่ำ" type="number" value={form.min_stock_qty} onChange={(e) => setForm((s) => ({ ...s, min_stock_qty: e.target.value }))} fullWidth />
              <TextField label="ยอดยกมา" type="number" value={form.opening_balance} onChange={(e) => setForm((s) => ({ ...s, opening_balance: e.target.value }))} fullWidth disabled={Boolean(editingId)} />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ xs: "flex-start", md: "center" }}>
              <Button component="label" variant="outlined" disabled={uploading}>
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลด/ถ่ายรูปสินค้า"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </Button>
              {form.image_url ? <img src={form.image_url} alt="preview" style={{ width: 86, height: 86, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }} /> : null}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button onClick={save} variant="contained" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar open={snack.open} message={snack.message} severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} />
    </Stack>
  );
}
