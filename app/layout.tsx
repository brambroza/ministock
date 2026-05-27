import type { Metadata } from "next";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/provider";

export const metadata: Metadata = {
  title: "ระบบสต๊อก LINE OA Management",
  description: "ระบบจัดการสต๊อกสินค้า LINE OA"
};

const theme = createTheme({
  palette: { primary: { main: "#06c755" }, secondary: { main: "#0f172a" }, background: { default: "#f5f7fb" } },
  shape: { borderRadius: 12 }
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
