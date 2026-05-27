"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const Ctx = createContext<{ user: User | null }>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange(() => supabase.auth.getUser().then(({ data }) => setUser(data.user)));
    return () => sub.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ user }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
