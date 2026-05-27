"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider } from "@/lib/auth/provider";

const theme = createTheme({
  palette: {
    primary: { main: "#06c755" },
    secondary: { main: "#0f172a" },
    background: { default: "#f5f7fb" }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Kanit, sans-serif"
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
