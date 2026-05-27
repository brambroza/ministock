"use client";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { useState } from "react";

type Opt = { id: string; name: string };

export function StockMovementForm({ action, products, locations, requireRemark = false }: { action: "receive" | "issue" | "adjust"; products: Opt[]; locations: Opt[]; requireRemark?: boolean }) {
  const [state, setState] = useState({ product_id: "", location_id: "", quantity: "", unit_cost: "", remark: "", direction: "IN" });
  const submit = async () => {
    const endpoint = action === "receive" ? "/api/stock/receive" : action === "issue" ? "/api/stock/issue" : "/api/stock/adjust";
    await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...state, quantity: Number(state.quantity), unit_cost: Number(state.unit_cost || 0) }) });
    alert("บันทึกแล้ว");
  };
  return (
    <Stack spacing={2}>
      {action === "adjust" ? <TextField select label="ทิศทาง" value={state.direction} onChange={(e) => setState({ ...state, direction: e.target.value })}><MenuItem value="IN">เพิ่ม</MenuItem><MenuItem value="OUT">ลด</MenuItem></TextField> : null}
      <TextField select label="สินค้า" value={state.product_id} onChange={(e) => setState({ ...state, product_id: e.target.value })}>{products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
      <TextField select label="คลัง" value={state.location_id} onChange={(e) => setState({ ...state, location_id: e.target.value })}>{locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}</TextField>
      <TextField label="จำนวน" type="number" value={state.quantity} onChange={(e) => setState({ ...state, quantity: e.target.value })} />
      <TextField label="ต้นทุน/หน่วย" type="number" value={state.unit_cost} onChange={(e) => setState({ ...state, unit_cost: e.target.value })} />
      <TextField label="หมายเหตุ" required={requireRemark} value={state.remark} onChange={(e) => setState({ ...state, remark: e.target.value })} />
      <Button size="large" variant="contained" onClick={submit}>บันทึก</Button>
    </Stack>
  );
}
