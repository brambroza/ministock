"use client";
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Toolbar, Typography } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import InventoryIcon from "@mui/icons-material/Inventory";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LiffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Box sx={{ pb: 9 }}>
      <AppBar position="sticky"><Toolbar><Typography>ระบบสต๊อก LIFF</Typography></Toolbar></AppBar>
      <Box sx={{ p: 2 }}>{children}</Box>
      <BottomNavigation showLabels value={pathname} sx={{ position: "fixed", bottom: 0, width: "100%", zIndex: 1200 }}>
        <BottomNavigationAction component={Link} href="/liff/dashboard" label="แดชบอร์ด" value="/liff/dashboard" icon={<DashboardIcon />} />
        <BottomNavigationAction component={Link} href="/liff/stock/scan" label="สแกน" value="/liff/stock/scan" icon={<QrCodeScannerIcon />} />
        <BottomNavigationAction component={Link} href="/liff/stock/on-hand" label="สต๊อก" value="/liff/stock/on-hand" icon={<InventoryIcon />} />
        <BottomNavigationAction component="a" href="/liff/expenses/monthly" label="ค่าใช้จ่าย" value="/liff/expenses/monthly" icon={<PaidRoundedIcon />} />
        <BottomNavigationAction component={Link} href="/liff/stock/stock-card" label="การ์ด" value="/liff/stock/stock-card" icon={<ReceiptLongIcon />} />
      </BottomNavigation>
    </Box>
  );
}
