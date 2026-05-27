"use client";
import { Card, CardContent, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/stock/BarcodeScanner";

export default function Page() {
  const router = useRouter();
  const onDetected = async (barcode: string) => {
    const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) router.push(`/portal/products/${data[0].id}`);
    else router.push(`/portal/products/new?barcode=${barcode}`);
  };
  return <Card><CardContent><Typography variant="h6" mb={2}>สแกนบาร์โค้ดสินค้า</Typography><BarcodeScanner onDetected={onDetected} /></CardContent></Card>;
}
