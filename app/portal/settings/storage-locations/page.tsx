"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
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
import { AppSnackbar } from "@/components/common/AppSnackbar";

type LocationItem = {
  id: string;
  location_code: string;
  location_name: string;
  description?: string | null;
  active?: boolean;
};

export default function Page() {
  const [items, setItems] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ location_code: "", location_name: "" });
  const [savingCreate, setSavingCreate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({ location_code: "", location_name: "", active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" | "warning" }>({
    open: false,
    message: "",
    severity: "info"
  });

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/locations", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "ไม่สามารถโหลดข้อมูลสถานที่จัดเก็บได้");
        setItems([]);
        return;
      }
      if (!Array.isArray(data)) {
        setError("ข้อมูลสถานที่จัดเก็บไม่ถูกต้อง");
        setItems([]);
        return;
      }
      setItems(data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลสถานที่จัดเก็บได้");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const createItem = async () => {
    if (!form.location_code.trim() || !form.location_name.trim()) {
      setSnack({ open: true, message: "กรุณากรอกรหัสและชื่อสถานที่จัดเก็บ", severity: "warning" });
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location_code: form.location_code.trim(),
          location_name: form.location_name.trim(),
          active: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "เพิ่มสถานที่จัดเก็บไม่สำเร็จ", severity: "error" });
        return;
      }

      setItems((prev) => [data, ...prev]);
      setForm({ location_code: "", location_name: "" });
      setSnack({ open: true, message: "เพิ่มสถานที่จัดเก็บเรียบร้อย", severity: "success" });
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (item: LocationItem) => {
    setEditingId(item.id);
    setEditingForm({ location_code: item.location_code, location_name: item.location_name, active: item.active ?? true });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingForm({ location_code: "", location_name: "", active: true });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editingForm.location_code.trim() || !editingForm.location_name.trim()) {
      setSnack({ open: true, message: "กรุณากรอกรหัสและชื่อสถานที่จัดเก็บ", severity: "warning" });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/locations/${editingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location_code: editingForm.location_code.trim(),
          location_name: editingForm.location_name.trim(),
          active: editingForm.active
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "แก้ไขสถานที่จัดเก็บไม่สำเร็จ", severity: "error" });
        return;
      }
      setItems((prev) => prev.map((u) => (u.id === editingId ? data : u)));
      setSnack({ open: true, message: "บันทึกการแก้ไขเรียบร้อย", severity: "success" });
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setSnack({ open: true, message: data?.error ?? "ลบสถานที่จัดเก็บไม่สำเร็จ", severity: "error" });
      return;
    }
    setItems((prev) => prev.filter((u) => u.id !== id));
    setSnack({ open: true, message: "ลบสถานที่จัดเก็บเรียบร้อย", severity: "success" });
  };

  const pagedItems = useMemo(() => {
    if (rowsPerPage === -1) return items;
    const start = page * rowsPerPage;
    return items.slice(start, start + rowsPerPage);
  }, [items, page, rowsPerPage]);

  const total = items.length;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>จัดการสถานที่จัดเก็บ</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="รหัสสถานที่"
              value={form.location_code}
              onChange={(e) => setForm((s) => ({ ...s, location_code: e.target.value }))}
              fullWidth
            />
            <TextField
              label="ชื่อสถานที่"
              value={form.location_name}
              onChange={(e) => setForm((s) => ({ ...s, location_name: e.target.value }))}
              fullWidth
            />
            <Button variant="contained" onClick={createItem} disabled={savingCreate || loading} sx={{ minWidth: 120 }}>
              {savingCreate ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Stack spacing={1.2}>
          {pagedItems.map((u) => (
            <Card key={u.id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
              <CardContent>
                {editingId === u.id ? (
                  <Stack spacing={1.2}>
                    <TextField size="small" label="รหัส" value={editingForm.location_code} onChange={(e) => setEditingForm((s) => ({ ...s, location_code: e.target.value }))} />
                    <TextField size="small" label="ชื่อ" value={editingForm.location_name} onChange={(e) => setEditingForm((s) => ({ ...s, location_name: e.target.value }))} />
                    <TextField
                      size="small"
                      select
                      label="สถานะ"
                      value={editingForm.active ? "active" : "inactive"}
                      onChange={(e) => setEditingForm((s) => ({ ...s, active: e.target.value === "active" }))}
                    >
                      <MenuItem value="active">ใช้งาน</MenuItem>
                      <MenuItem value="inactive">ไม่ใช้งาน</MenuItem>
                    </TextField>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveEdit} disabled={savingEdit}>บันทึก</Button>
                      <Button size="small" variant="outlined" startIcon={<CancelRoundedIcon />} onClick={cancelEdit}>ยกเลิก</Button>
                    </Stack>
                  </Stack>
                ) : (
                  <>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.8}>
                      <Typography fontWeight={700}>{u.location_code}</Typography>
                      <Chip size="small" label={u.active === false ? "ไม่ใช้งาน" : "ใช้งาน"} color={u.active === false ? "default" : "success"} />
                    </Stack>
                    <Typography color="text.secondary" mb={1.2}>{u.location_name}</Typography>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => startEdit(u)}><EditRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteItem(u.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      <Paper elevation={0} sx={{ display: { xs: "none", md: "block" }, border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รหัส</TableCell>
              <TableCell>ชื่อสถานที่</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedItems.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell width={180}>
                  {editingId === u.id ? (
                    <TextField size="small" value={editingForm.location_code} onChange={(e) => setEditingForm((s) => ({ ...s, location_code: e.target.value }))} />
                  ) : u.location_code}
                </TableCell>
                <TableCell>
                  {editingId === u.id ? (
                    <TextField size="small" fullWidth value={editingForm.location_name} onChange={(e) => setEditingForm((s) => ({ ...s, location_name: e.target.value }))} />
                  ) : u.location_name}
                </TableCell>
                <TableCell width={140}>
                  {editingId === u.id ? (
                    <TextField
                      size="small"
                      select
                      value={editingForm.active ? "active" : "inactive"}
                      onChange={(e) => setEditingForm((s) => ({ ...s, active: e.target.value === "active" }))}
                    >
                      <MenuItem value="active">ใช้งาน</MenuItem>
                      <MenuItem value="inactive">ไม่ใช้งาน</MenuItem>
                    </TextField>
                  ) : (
                    <Chip size="small" label={u.active === false ? "ไม่ใช้งาน" : "ใช้งาน"} color={u.active === false ? "default" : "success"} />
                  )}
                </TableCell>
                <TableCell align="right" width={170}>
                  {editingId === u.id ? (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" color="primary" onClick={saveEdit} disabled={savingEdit}><SaveRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={cancelEdit}><CancelRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => startEdit(u)}><EditRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteItem(u.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && pagedItems.length === 0 ? (
              <TableRow><TableCell colSpan={4}><Typography color="text.secondary">ไม่มีข้อมูลสถานที่จัดเก็บ</Typography></TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage === -1 ? total || 1 : rowsPerPage}
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

      <AppSnackbar
        open={snack.open}
        message={snack.message}
        severity={snack.severity}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      />
    </Stack>
  );
}
