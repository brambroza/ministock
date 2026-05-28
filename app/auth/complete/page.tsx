"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("กำลังยืนยันตัวตน...");

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) {
          setMessage("ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่");
          return;
        }
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setMessage("ไม่พบ session กรุณาเข้าสู่ระบบใหม่");
        router.replace("/login");
        return;
      }

      const next = searchParams.get("next") || "/portal/dashboard";
      window.location.href = next;
      router.refresh();
    };

    run();
  }, [router, searchParams]);

  return (
    <Box minHeight="100vh" display="grid" sx={{ placeItems: "center", bgcolor: "#f3f6fb" }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress />
        <Typography>{message}</Typography>
      </Stack>
    </Box>
  );
}
