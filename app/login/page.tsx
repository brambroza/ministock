"use client";

import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginWithEmail = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      location.href = "/portal/dashboard";
    } finally {
      setLoading(false);
    }
  };

  const loginWithLine = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/portal/dashboard`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "line" as never,
        options: { redirectTo }
      });
      if (oauthError) setError(oauthError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={2} minHeight="100vh" display="grid" sx={{ placeItems: "center", background: "#f3f6fb" }}>
      <Card sx={{ width: "100%", maxWidth: 440, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>เข้าสู่ระบบ</Typography>
            <Typography color="text.secondary">รองรับทั้ง LINE และอีเมล/รหัสผ่าน</Typography>

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
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
