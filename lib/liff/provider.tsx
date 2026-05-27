"use client";
import { createContext, useContext, useEffect, useState } from "react";
import liff from "liff";

type LiffCtx = { initialized: boolean; lineUserId?: string };
const Ctx = createContext<LiffCtx>({ initialized: false });

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiffCtx>({ initialized: false });
  useEffect(() => {
    const run = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? "" });
        if (!liff.isLoggedIn()) liff.login();
        const profile = await liff.getProfile();
        await fetch("/api/auth/bind-line", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ line_user_id: profile.userId }) });
        setState({ initialized: true, lineUserId: profile.userId });
      } catch {
        setState({ initialized: true });
      }
    };
    run();
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useLiff() { return useContext(Ctx); }
