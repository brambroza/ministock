"use client";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

export default function Page() {
  const [items, setItems] = useState<Array<{ id: string; location_name: string; location_code: string }>>([]);
  const [form, setForm] = useState({ location_code: "", location_name: "" });
  useEffect(() => { fetch('/api/locations').then(r=>r.json()).then(setItems); }, []);
  const save = async () => { await fetch('/api/locations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }); location.reload(); };
  return <Stack spacing={2}><Typography variant="h5">สถานที่จัดเก็บ</Typography><Card><CardContent><Stack direction="row" spacing={2}><TextField label="รหัส" value={form.location_code} onChange={(e)=>setForm({ ...form, location_code: e.target.value })} /><TextField label="ชื่อ" value={form.location_name} onChange={(e)=>setForm({ ...form, location_name: e.target.value })} /><Button variant="contained" onClick={save}>เพิ่ม</Button></Stack></CardContent></Card>{items.map(u => <Card key={u.id}><CardContent>{u.location_code} - {u.location_name}</CardContent></Card>)}</Stack>;
}
