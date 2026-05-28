"use client";

import {
  AppBar,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography
} from "@mui/material";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import OutboxRoundedIcon from "@mui/icons-material/OutboxRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ReceiptRoundedIcon from "@mui/icons-material/ReceiptRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  type: "RECEIVE" | "ISSUE" | "LOW_STOCK";
  title: string;
  message: string;
  created_at: string;
  href: string;
};

type Profile = {
  display_name: string;
  line_display_name: string | null;
  line_picture_url: string | null;
};

const drawerWidth = 280;

const menus = [
  { label: "แดชบอร์ด", href: "/portal/dashboard", icon: <DashboardRoundedIcon /> },
  { label: "สินค้า", href: "/portal/products", icon: <Inventory2RoundedIcon /> },
  { label: "หน่วยนับ", href: "/portal/settings/units", icon: <SettingsRoundedIcon /> },
  { label: "คลังสินค้า", href: "/portal/settings/storage-locations", icon: <WarehouseRoundedIcon /> },
  { label: "สต๊อกคงเหลือ", href: "/portal/stock/on-hand", icon: <Inventory2RoundedIcon /> },
  { label: "การ์ดสต๊อก", href: "/portal/stock/stock-card", icon: <ReceiptLongRoundedIcon /> },
  { label: "รับเข้า", href: "/portal/stock/receive", icon: <MoveToInboxRoundedIcon /> },
  { label: "เบิกออก", href: "/portal/stock/issue", icon: <OutboxRoundedIcon /> },
  { label: "ปรับสต๊อก", href: "/portal/stock/adjust", icon: <TuneRoundedIcon /> },
  { label: "สแกนบิลค่าใช้จ่าย", href: "/portal/expenses/scan", icon: <ReceiptRoundedIcon /> },
  { label: "รายงานซื้อ", href: "/portal/reports/monthly-purchase", icon: <AssessmentRoundedIcon /> },
  { label: "รายงานคงเหลือ", href: "/portal/reports/monthly-balance", icon: <AssessmentRoundedIcon /> },
  { label: "สต๊อกต่ำ", href: "/portal/reports/low-stock", icon: <WarningAmberRoundedIcon /> },
  { label: "ผู้ใช้", href: "/portal/users", icon: <GroupRoundedIcon /> },
  { label: "แชร์ลิงก์ทีม", href: "/portal/users/share", icon: <ShareRoundedIcon /> },
  { label: "โปรไฟล์", href: "/portal/profile", icon: <PersonRoundedIcon /> }
] as const;

const mobileMenus = [
  { label: "แดชบอร์ด", href: "/portal/dashboard", icon: <DashboardRoundedIcon /> },
  { label: "สินค้า", href: "/portal/products", icon: <Inventory2RoundedIcon /> },
  { label: "คงเหลือ", href: "/portal/stock/on-hand", icon: <WarehouseRoundedIcon /> },
  { label: "รับเข้า", href: "/portal/stock/receive", icon: <MoveToInboxRoundedIcon /> },
  { label: "ค่าใช้จ่าย", href: "/portal/expenses/scan", icon: <ReceiptRoundedIcon /> },
  { label: "รายงาน", href: "/portal/reports/monthly-balance", icon: <AssessmentRoundedIcon /> }
] as const;

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileMenuEl, setProfileMenuEl] = useState<null | HTMLElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!mounted) return;
      setNotifications(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setProfile(data));
  }, []);

  const openMenu = Boolean(anchorEl);
  const openProfileMenu = Boolean(profileMenuEl);
  const notificationLabel = useMemo(() => `แจ้งเตือน ${unreadCount} รายการ`, [unreadCount]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const displayName = profile?.line_display_name || profile?.display_name || "ผู้ใช้งาน";

  const drawerContent = (
    <Box sx={{ height: "100%", background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar src={profile?.line_picture_url ?? undefined} sx={{ bgcolor: "primary.main", fontWeight: 700 }}>
          {displayName.charAt(0)}
        </Avatar>
        <Box>
          <Typography fontWeight={700}>Mini Stock</Typography>
          <Typography variant="caption" color="text.secondary">{displayName}</Typography>
        </Box>
      </Box>
      <List sx={{ px: 1.2 }}>
        {menus.map((menu) => {
          const active = pathname.startsWith(menu.href);
          return (
            <ListItemButton
              key={menu.href}
              component={Link}
              href={menu.href as Route}
              onClick={() => setOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: 2.5,
                bgcolor: active ? "rgba(6,199,85,0.10)" : "transparent",
                color: active ? "primary.main" : "text.primary"
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{menu.icon}</ListItemIcon>
              <ListItemText primary={menu.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", background: "#f3f6fb" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "rgba(255,255,255,0.85)",
          color: "text.primary",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <IconButton sx={{ display: { xs: "inline-flex", md: "none" }, mr: 1 }} onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography fontWeight={800}>Mini Stock</Typography>
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton aria-label={notificationLabel} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Badge color="error" badgeContent={unreadCount > 99 ? "99+" : unreadCount}>
                <NotificationsRoundedIcon />
              </Badge>
            </IconButton>
            <IconButton onClick={(e) => setProfileMenuEl(e.currentTarget)}>
              <Avatar src={profile?.line_picture_url ?? undefined} sx={{ width: 34, height: 34 }}>
                {displayName.charAt(0)}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={profileMenuEl}
              open={openProfileMenu}
              onClose={() => setProfileMenuEl(null)}
              PaperProps={{ sx: { minWidth: 220, borderRadius: 2 } }}
            >
              <Box sx={{ px: 2, py: 1.2 }}>
                <Typography fontWeight={700}>{displayName}</Typography>
                <Typography variant="caption" color="text.secondary">บัญชีผู้ใช้งาน</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setProfileMenuEl(null); router.push("/portal/profile"); }}>
                <ListItemIcon><PersonRoundedIcon fontSize="small" /></ListItemIcon>
                แก้ไขโปรไฟล์
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
                ออกจากระบบ
              </MenuItem>
            </Menu>
            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={() => setAnchorEl(null)}
              PaperProps={{ sx: { width: 360, maxWidth: "92vw", borderRadius: 2 } }}
            >
              <MenuItem disabled sx={{ opacity: 1 }}>
                <Typography fontWeight={700}>การแจ้งเตือน</Typography>
              </MenuItem>
              {notifications.length === 0 ? (
                <MenuItem disabled>ยังไม่มีแจ้งเตือน</MenuItem>
              ) : (
                notifications.map((item) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => { setAnchorEl(null); router.push(item.href as Route); }}
                    sx={{ alignItems: "flex-start", whiteSpace: "normal" }}
                  >
                    <Box>
                      <Typography fontWeight={600} fontSize={14}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.message}</Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #e5e7eb",
            top: 0
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        sx={{ display: { xs: "block", md: "none" }, [`& .MuiDrawer-paper`]: { width: drawerWidth } }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          pt: "84px",
          pb: { xs: "90px", md: 3 },
          px: { xs: 1.5, sm: 2.5, md: 3 },
          ml: { md: `${drawerWidth}px` }
        }}
      >
        <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 3, border: "1px solid #e5e7eb", bgcolor: "#fff" }}>
          {children}
        </Paper>
      </Box>

      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          left: 12,
          right: 12,
          bottom: 10,
          borderRadius: 1,
          overflow: "hidden",
          display: { xs: "block", md: "none" }
        }}
      >
        <BottomNavigation showLabels value={pathname} sx={{ height: 64    }}>
          {mobileMenus.map((menu) => (
            <BottomNavigationAction
              key={menu.href}
              component={Link}
              href={menu.href as Route}
              value={menu.href}
              label={menu.label}
              icon={menu.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
