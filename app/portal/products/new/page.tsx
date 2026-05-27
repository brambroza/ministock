"use client";
import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

export default function Page() {
  const [form, setForm] = useState({ barcode: "", product_name: "", unit_id: "", price: 0, cost: 0, min_stock_qty: 0, opening_balance: 0, storage_location_id: "" });
  const save = async () => {
    await fetch("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    location.href = "/portal/products";
  };
  return <Card><CardContent><Stack spacing={2}><Typography variant="h6">เพิ่มสินค้าใหม่</Typography><TextField label="บาร์โค้ด" value={form.barcode} onChange={(e)=>setForm({ ...form, barcode: e.target.value })} /><TextField label="ชื่อสินค้า" value={form.product_name} onChange={(e)=>setForm({ ...form, product_name: e.target.value })} /><TextField label="รหัสหน่วยนับ" value={form.unit_id} onChange={(e)=>setForm({ ...form, unit_id: e.target.value })} /><TextField label="ราคาขาย" type="number" onChange={(e)=>setForm({ ...form, price: Number(e.target.value) })} /><TextField label="ต้นทุน" type="number" onChange={(e)=>setForm({ ...form, cost: Number(e.target.value) })} /><TextField label="สต๊อกขั้นต่ำ" type="number" onChange={(e)=>setForm({ ...form, min_stock_qty: Number(e.target.value) })} /><TextField label="ยอดยกมา" type="number" onChange={(e)=>setForm({ ...form, opening_balance: Number(e.target.value) })} /><TextField label="รหัสคลัง" value={form.storage_location_id} onChange={(e)=>setForm({ ...form, storage_location_id: e.target.value })} /><Button variant="contained" onClick={save}>บันทึก</Button></Stack></CardContent></Card>;
}
