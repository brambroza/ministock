"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

type UnitItem = { id: string; unit_name: string; unit_code: string };

export default function Page() {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ unit_code: "", unit_name: "" });

  useEffect(() => {
    fetch("/api/units", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUnits(data);
          setError("");
        } else {
          setUnits([]);
          setError(data?.error ?? "ไม่สามารถโหลดข้อมูลหน่วยนับได้");
        }
      })
      .catch(() => {
        setUnits([]);
        setError("ไม่สามารถโหลดข้อมูลหน่วยนับได้");
      });
  }, []);

  const save = async () => {
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "บันทึกหน่วยนับไม่สำเร็จ");
      return;
    }
    location.reload();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">หน่วยนับ</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2}>
            <TextField label="รหัส" value={form.unit_code} onChange={(e) => setForm({ ...form, unit_code: e.target.value })} />
            <TextField label="ชื่อ" value={form.unit_name} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} />
            <Button variant="contained" onClick={save}>เพิ่ม</Button>
          </Stack>
        </CardContent>
      </Card>
      {units.map((u) => (
        <Card key={u.id}>
          <CardContent>{u.unit_code} - {u.unit_name}</CardContent>
        </Card>
      ))}
    </Stack>
  );
}
