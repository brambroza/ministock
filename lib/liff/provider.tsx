"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import liff from "@line/liff";

type LiffCtx = { initialized: boolean; lineUserId?: string };
const Ctx = createContext<LiffCtx>({ initialized: false });

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffCtx>({ initialized: false });

  useEffect(() => {
    const run = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? "" });
        if (!liff.isLoggedIn()) {
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
        }

        setState({ initialized: true, lineUserId: profile.userId });
      } catch {
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

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useLiff() {
  return useContext(Ctx);
}
