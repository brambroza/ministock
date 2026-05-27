"use client";
import { Alert } from "@mui/material";

export function PermissionGuard({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return <Alert severity="error">ไม่มีสิทธิ์ใช้งาน</Alert>;
  return <>{children}</>;
}

export function CompanyGuard({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return <Alert severity="warning">ไม่พบบริษัทที่ผูกกับบัญชีผู้ใช้</Alert>;
  return <>{children}</>;
}
