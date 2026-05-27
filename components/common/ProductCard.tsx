"use client";
import { Card, CardContent, Chip, Typography } from "@mui/material";

export function ProductCard({ name, barcode, active }: { name: string; barcode: string; active: boolean }) {
  return <Card><CardContent><Typography fontWeight={700}>{name}</Typography><Typography color="text.secondary">{barcode}</Typography><Chip size="small" label={active ? "ใช้งาน" : "ไม่ใช้งาน"} /></CardContent></Card>;
}
