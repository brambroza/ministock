"use client";

import { useEffect, useState } from "react";
import { Avatar, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

type Profile = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  line_user_id: string | null;
  line_display_name: string | null;
  line_picture_url: string | null;
};

export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ display_name: "", email: "", phone: "" });

  useEffect(() => {
    fetch("/api/auth/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({
          display_name: data?.display_name ?? "",
          email: data?.email ?? "",
          phone: data?.phone ?? ""
        });
      });
  }, []);

  const onSave = async () => {
    await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    alert("บันทึกโปรไฟล์เรียบร้อย");
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" mb={2}>แก้ไขโปรไฟล์</Typography>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={profile?.line_picture_url ?? undefined} sx={{ width: 64, height: 64 }}>
              {form.display_name?.charAt(0) || "U"}
            </Avatar>
            <Box>
              <Typography fontWeight={700}>{profile?.line_display_name || form.display_name || "ผู้ใช้งาน"}</Typography>
              <Typography variant="body2" color="text.secondary">LINE User ID: {profile?.line_user_id || "-"}</Typography>
            </Box>
          </Box>

          <TextField
            label="ชื่อที่แสดง"
            value={form.display_name}
            onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))}
          />
          <TextField
            label="อีเมล"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <TextField
            label="เบอร์โทร"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />

          <Button variant="contained" onClick={onSave}>บันทึกข้อมูล</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
