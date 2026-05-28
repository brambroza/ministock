"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";

export default function JoinCompanyPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        const me = await fetch("/api/auth/current-user", { cache: "no-store" });
        const meData = await me.json();
        if (!me.ok || !meData?.id) {
          window.location.href = `/login?next=${encodeURIComponent(`/join/${token}`)}`;
          return;
        }

        const redeem = await fetch("/api/invite-links/redeem", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token })
        });

        const payload = await redeem.json();
        if (!redeem.ok) {
          setError(payload?.error ?? "เข้าร่วมทีมไม่สำเร็จ");
          return;
        }

        setOk(true);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  return (
    <Box minHeight="100vh" display="grid" sx={{ placeItems: "center", bgcolor: "#f3f6fb", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 520, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={800}>เข้าร่วมทีมงาน</Typography>
            {loading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={22} />
                <Typography>กำลังตรวจสอบลิงก์เชิญ...</Typography>
              </Stack>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            {ok ? <Alert severity="success">เข้าร่วมทีมสำเร็จแล้ว คุณสามารถใช้งานข้อมูลบริษัทเดียวกันได้ทันที</Alert> : null}

            <Button variant="contained" size="large" onClick={() => (window.location.href = "/portal/dashboard")}>ไปหน้าแดชบอร์ด</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
