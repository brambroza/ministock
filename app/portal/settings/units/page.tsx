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

type UnitItem = {
  id: string;
  unit_code: string;
  unit_name: string;
  description?: string | null;
  active?: boolean;
};

export default function Page() {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ unit_code: "", unit_name: "" });
  const [savingCreate, setSavingCreate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({ unit_code: "", unit_name: "", active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" | "warning" }>({
    open: false,
    message: "",
    severity: "info"
  });

  const loadUnits = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/units", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "ไม่สามารถโหลดข้อมูลหน่วยนับได้");
        setUnits([]);
        return;
      }
      if (!Array.isArray(data)) {
        setError("ข้อมูลหน่วยนับไม่ถูกต้อง");
        setUnits([]);
        return;
      }
      setUnits(data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลหน่วยนับได้");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUnits();
  }, []);

  const createUnit = async () => {
    if (!form.unit_code.trim() || !form.unit_name.trim()) {
      setSnack({ open: true, message: "กรุณากรอกรหัสและชื่อหน่วยนับ", severity: "warning" });
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unit_code: form.unit_code.trim(),
          unit_name: form.unit_name.trim(),
          active: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "เพิ่มหน่วยนับไม่สำเร็จ", severity: "error" });
        return;
      }

      setUnits((prev) => [data, ...prev]);
      setForm({ unit_code: "", unit_name: "" });
      setSnack({ open: true, message: "เพิ่มหน่วยนับเรียบร้อย", severity: "success" });
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (item: UnitItem) => {
    setEditingId(item.id);
    setEditingForm({ unit_code: item.unit_code, unit_name: item.unit_name, active: item.active ?? true });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingForm({ unit_code: "", unit_name: "", active: true });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editingForm.unit_code.trim() || !editingForm.unit_name.trim()) {
      setSnack({ open: true, message: "กรุณากรอกรหัสและชื่อหน่วยนับ", severity: "warning" });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/units/${editingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unit_code: editingForm.unit_code.trim(),
          unit_name: editingForm.unit_name.trim(),
          active: editingForm.active
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSnack({ open: true, message: data?.error ?? "แก้ไขหน่วยนับไม่สำเร็จ", severity: "error" });
        return;
      }
      setUnits((prev) => prev.map((u) => (u.id === editingId ? data : u)));
      setSnack({ open: true, message: "บันทึกการแก้ไขเรียบร้อย", severity: "success" });
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteUnit = async (id: string) => {
    const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setSnack({ open: true, message: data?.error ?? "ลบหน่วยนับไม่สำเร็จ", severity: "error" });
      return;
    }
    setUnits((prev) => prev.filter((u) => u.id !== id));
    setSnack({ open: true, message: "ลบหน่วยนับเรียบร้อย", severity: "success" });
  };

  const pagedUnits = useMemo(() => {
    if (rowsPerPage === -1) return units;
    const start = page * rowsPerPage;
    return units.slice(start, start + rowsPerPage);
  }, [units, page, rowsPerPage]);

  const total = units.length;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>จัดการหน่วยนับ</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 1 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="รหัสหน่วยนับ"
              value={form.unit_code}
              onChange={(e) => setForm((s) => ({ ...s, unit_code: e.target.value }))}
              fullWidth
            />
            <TextField
              label="ชื่อหน่วยนับ"
              value={form.unit_name}
              onChange={(e) => setForm((s) => ({ ...s, unit_name: e.target.value }))}
              fullWidth
            />
            <Button variant="contained" onClick={createUnit} disabled={savingCreate || loading} sx={{ minWidth: 120 }}>
              {savingCreate ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Stack spacing={1.2}>
          {pagedUnits.map((u) => (
            <Card key={u.id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
              <CardContent>
                {editingId === u.id ? (
                  <Stack spacing={1.2}>
                    <TextField size="small" label="รหัส" value={editingForm.unit_code} onChange={(e) => setEditingForm((s) => ({ ...s, unit_code: e.target.value }))} />
                    <TextField size="small" label="ชื่อ" value={editingForm.unit_name} onChange={(e) => setEditingForm((s) => ({ ...s, unit_name: e.target.value }))} />
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
                      <Typography fontWeight={700}>{u.unit_code}</Typography>
                      <Chip size="small" label={u.active === false ? "ไม่ใช้งาน" : "ใช้งาน"} color={u.active === false ? "default" : "success"} />
                    </Stack>
                    <Typography color="text.secondary" mb={1.2}>{u.unit_name}</Typography>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => startEdit(u)}><EditRoundedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteUnit(u.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      <Paper elevation={0} sx={{ display: { xs: "none", md: "block" }, border: "1px solid #e5e7eb", borderRadius: 1, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รหัส</TableCell>
              <TableCell>ชื่อหน่วยนับ</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedUnits.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell width={160}>
                  {editingId === u.id ? (
                    <TextField size="small" value={editingForm.unit_code} onChange={(e) => setEditingForm((s) => ({ ...s, unit_code: e.target.value }))} />
                  ) : u.unit_code}
                </TableCell>
                <TableCell>
                  {editingId === u.id ? (
                    <TextField size="small" fullWidth value={editingForm.unit_name} onChange={(e) => setEditingForm((s) => ({ ...s, unit_name: e.target.value }))} />
                  ) : u.unit_name}
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
                      <IconButton size="small" color="error" onClick={() => deleteUnit(u.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && pagedUnits.length === 0 ? (
              <TableRow><TableCell colSpan={4}><Typography color="text.secondary">ไม่มีข้อมูลหน่วยนับ</Typography></TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
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
