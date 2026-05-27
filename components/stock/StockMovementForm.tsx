"use client";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { AppSnackbar } from "@/components/common/AppSnackbar";

type Opt = { id: string; name: string };

export function StockMovementForm({ action, products, locations, requireRemark = false }: { action: "receive" | "issue" | "adjust"; products: Opt[]; locations: Opt[]; requireRemark?: boolean }) {
  const [state, setState] = useState({ product_id: "", location_id: "", quantity: "", unit_cost: "", remark: "", direction: "IN" });
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" | "warning" }>({ open: false, message: "", severity: "info" });
  const submit = async () => {
    const endpoint = action === "receive" ? "/api/stock/receive" : action === "issue" ? "/api/stock/issue" : "/api/stock/adjust";
    const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...state, quantity: Number(state.quantity), unit_cost: Number(state.unit_cost || 0) }) });
    if (!res.ok) {
      const data = await res.json();
      setSnack({ open: true, message: data?.error ?? "บันทึกไม่สำเร็จ", severity: "error" });
      return;
    }
    setSnack({ open: true, message: "บันทึกเรียบร้อย", severity: "success" });
  };
  return (
    <>
    <Stack spacing={2}>
      {action === "adjust" ? <TextField select label="ทิศทาง" value={state.direction} onChange={(e) => setState({ ...state, direction: e.target.value })}><MenuItem value="IN">เพิ่ม</MenuItem><MenuItem value="OUT">ลด</MenuItem></TextField> : null}
      <TextField select label="สินค้า" value={state.product_id} onChange={(e) => setState({ ...state, product_id: e.target.value })}>{products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
      <TextField select label="คลัง" value={state.location_id} onChange={(e) => setState({ ...state, location_id: e.target.value })}>{locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}</TextField>
      <TextField label="จำนวน" type="number" value={state.quantity} onChange={(e) => setState({ ...state, quantity: e.target.value })} />
      <TextField label="ต้นทุน/หน่วย" type="number" value={state.unit_cost} onChange={(e) => setState({ ...state, unit_cost: e.target.value })} />
      <TextField label="หมายเหตุ" required={requireRemark} value={state.remark} onChange={(e) => setState({ ...state, remark: e.target.value })} />
      <Button size="large" variant="contained" onClick={submit}>บันทึก</Button>
    </Stack>
    <AppSnackbar open={snack.open} message={snack.message} severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} />
    </>
  );
}
