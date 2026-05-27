"use client";

import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [reason, setReason] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("reason");
    setReason(r);
  }, []);

  const loginWithEmail = async () => {
    setLoading(true);
    setError("");
    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        setError(data?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      if (reason === "unlinked") {
        await fetch("/api/auth/line/link-pending", { method: "POST" });
      }

      location.href = "/portal/dashboard";
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async () => {
    setLoading(true);
    setError("");
    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, display_name: email })
      });

      if (!registerRes.ok) {
        const data = await registerRes.json();
        setError(data?.error ?? "สมัครสมาชิกไม่สำเร็จ");
        return;
      }

      // Auto login after successful registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!loginRes.ok) {
        const data = await loginRes.json();
        setError(data?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      location.href = "/portal/dashboard";
    } finally {
      setLoading(false);
    }
  };

  const loginWithLine = async () => {
    window.location.href = "/api/auth/line/login";
  };

  return (
    <Box p={2} minHeight="100vh" display="grid" sx={{ placeItems: "center", background: "#f3f6fb" }}>
      <Card sx={{ width: "100%", maxWidth: 440, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>เข้าสู่ระบบ</Typography>
            <Typography color="text.secondary">รองรับทั้ง LINE และอีเมล/รหัสผ่าน</Typography>

            {reason === "unlinked" ? (
              <Alert severity="warning">บัญชี LINE ยังไม่ถูกผูกกับระบบ กรุณาเข้าสู่ระบบด้วยอีเมล 1 ครั้งเพื่อผูกบัญชีอัตโนมัติ</Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}

            <Button size="large" variant="contained" onClick={loginWithLine} disabled={loading}>
              เข้าสู่ระบบด้วย LINE
            </Button>

            <Divider>หรือ</Divider>

            <TextField label="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField type="password" label="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button size="large" variant="outlined" onClick={loginWithEmail} disabled={loading}>
              เข้าสู่ระบบด้วยอีเมล
            </Button>
            <Button size="large" variant="text" onClick={registerWithEmail} disabled={loading}>
              สมัครสมาชิกด้วยอีเมล
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
