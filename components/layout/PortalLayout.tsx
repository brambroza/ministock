"use client";
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from "@mui/material";
import Link from "next/link";

const menus = [
  ["แดชบอร์ด", "/portal/dashboard"],
  ["สินค้า", "/portal/products"],
  ["หน่วยนับ", "/portal/settings/units"],
  ["คลังสินค้า", "/portal/settings/storage-locations"],
  ["สต๊อกคงเหลือ", "/portal/stock/on-hand"],
  ["การ์ดสต๊อก", "/portal/stock/stock-card"],
  ["รับเข้า", "/portal/stock/receive"],
  ["เบิกออก", "/portal/stock/issue"],
  ["ปรับสต๊อก", "/portal/stock/adjust"],
  ["รายงานซื้อ", "/portal/reports/monthly-purchase"],
  ["รายงานคงเหลือ", "/portal/reports/monthly-balance"],
  ["สต๊อกต่ำ", "/portal/reports/low-stock"],
  ["ผู้ใช้", "/portal/users"]
] as const;

export function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}><Toolbar><Typography variant="h6">ระบบสต๊อก LINE OA</Typography></Toolbar></AppBar>
      <Drawer variant="permanent" sx={{ width: 260, [`& .MuiDrawer-paper`]: { width: 260, top: 64 } }}>
        <List>{menus.map(([label, href]) => <ListItemButton key={href} component={Link} href={href}><ListItemText primary={label} /></ListItemButton>)}</List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: "260px", mt: "64px" }}>{children}</Box>
    </Box>
  );
}
