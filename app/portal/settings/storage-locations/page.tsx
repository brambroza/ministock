"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

type LocationItem = { id: string; location_name: string; location_code: string };

export default function Page() {
  const [items, setItems] = useState<LocationItem[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ location_code: "", location_name: "" });

  useEffect(() => {
    fetch("/api/locations", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
          setError("");
        } else {
          setItems([]);
          setError(data?.error ?? "ไม่สามารถโหลดข้อมูลสถานที่จัดเก็บได้");
        }
      })
      .catch(() => {
        setItems([]);
        setError("ไม่สามารถโหลดข้อมูลสถานที่จัดเก็บได้");
      });
  }, []);

  const save = async () => {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "บันทึกสถานที่จัดเก็บไม่สำเร็จ");
      return;
    }

    location.reload();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">สถานที่จัดเก็บ</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2}>
            <TextField label="รหัส" value={form.location_code} onChange={(e) => setForm({ ...form, location_code: e.target.value })} />
            <TextField label="ชื่อ" value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
            <Button variant="contained" onClick={save}>เพิ่ม</Button>
          </Stack>
        </CardContent>
      </Card>
      {items.map((u) => (
        <Card key={u.id}>
          <CardContent>{u.location_code} - {u.location_name}</CardContent>
        </Card>
      ))}
    </Stack>
  );
}
