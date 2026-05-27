"use client";
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email, password });
    location.href = "/portal/dashboard";
  };
  return <Box p={2} minHeight="100vh" display="grid" sx={{ placeItems: "center" }}><Card sx={{ width: "100%", maxWidth: 420 }}><CardContent><Stack spacing={2}><Typography variant="h5">เข้าสู่ระบบ</Typography><TextField label="อีเมล" value={email} onChange={(e)=>setEmail(e.target.value)} /><TextField type="password" label="รหัสผ่าน" value={password} onChange={(e)=>setPassword(e.target.value)} /><Button variant="contained" onClick={login}>เข้าสู่ระบบ</Button></Stack></CardContent></Card></Box>;
}
