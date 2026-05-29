"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import liff from "@line/liff";

type LiffCtx = { initialized: boolean; lineUserId?: string };
const Ctx = createContext<LiffCtx>({ initialized: false });

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffCtx>({ initialized: false });
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
        if (!liffId) {
          setError("ไม่ได้ตั้งค่า LIFF ID");
          setState({ initialized: true });
          return;
        }

        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          // ถ้าไม่ล็อกอิน ให้ยิง login และปล่อย initialized ไว้ false รอ redirect กลับ
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const idToken = liff.getIDToken() ?? undefined;
        const res = await fetch("/api/liff/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            line_user_id: profile.userId,
            line_display_name: profile.displayName,
            line_picture_url: profile.pictureUrl ?? null,
            id_token: idToken
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({} as { error?: string }));
          if (data?.error === "unlinked") {
            window.location.href = "/liff/request-access";
            return;
          }
          // session bind พลาด ให้ใช้งานต่อได้ แต่แจ้งเตือน
          setError(data?.error ?? "ยืนยันสิทธิ์ LIFF ไม่สำเร็จ");
          setState({ initialized: true, lineUserId: profile.userId });
          return;
        }

        setState({ initialized: true, lineUserId: profile.userId });
      } catch {
        // fallback: ไม่บล็อกหน้า ให้ใช้งานต่อได้ (เผื่อมี session ฝั่งเว็บอยู่แล้ว)
        setError("เชื่อมต่อ LIFF ไม่สำเร็จ (กำลังใช้โหมดสำรอง)");
        setState({ initialized: true });
      }
    };

    void run();
  }, []);

  if (!state.initialized) {
    return (
      <Box minHeight="70vh" display="grid" sx={{ placeItems: "center" }}>
        <Stack spacing={1} alignItems="center">
          <CircularProgress size={26} />
          <Typography variant="body2" color="text.secondary">กำลังเชื่อมต่อ LINE...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Ctx.Provider value={state}>
        <Box sx={{ px: 2, pt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="warning.main">{error}</Typography>
            <Button size="small" onClick={() => window.location.reload()}>ลองใหม่</Button>
          </Stack>
        </Box>
        {children}
      </Ctx.Provider>
    );
  }

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useLiff() {
  return useContext(Ctx);
}
