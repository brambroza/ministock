"use client";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

export default function Page() {
  const [units, setUnits] = useState<Array<{ id: string; unit_name: string; unit_code: string }>>([]);
  const [form, setForm] = useState({ unit_code: "", unit_name: "" });
  useEffect(() => { fetch('/api/units').then(r=>r.json()).then(setUnits); }, []);
  const save = async () => { await fetch('/api/units', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }); location.reload(); };
  return <Stack spacing={2}><Typography variant="h5">หน่วยนับ</Typography><Card><CardContent><Stack direction="row" spacing={2}><TextField label="รหัส" value={form.unit_code} onChange={(e)=>setForm({ ...form, unit_code: e.target.value })} /><TextField label="ชื่อ" value={form.unit_name} onChange={(e)=>setForm({ ...form, unit_name: e.target.value })} /><Button variant="contained" onClick={save}>เพิ่ม</Button></Stack></CardContent></Card>{units.map(u => <Card key={u.id}><CardContent>{u.unit_code} - {u.unit_name}</CardContent></Card>)}</Stack>;
}
