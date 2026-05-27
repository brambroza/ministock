import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { PageHeader } from "@/components/common/Common";
import { ProductService } from "@/lib/services/product.service";

export default async function Page() {
  const { data } = await ProductService.getProducts();
  return <><PageHeader title="สินค้า" subtitle="ข้อมูลหลักสินค้า" /><Button component={Link} href="/portal/products/new" variant="contained" sx={{ mb: 2 }}>เพิ่มสินค้า</Button><Stack spacing={2}>{(data ?? []).map((p) => <Card key={p.id}><CardContent><Box display="flex" justifyContent="space-between"><div><Typography fontWeight={700}>{p.product_name}</Typography><Typography color="text.secondary">{p.barcode}</Typography></div><Chip label={p.active ? "ใช้งาน" : "ไม่ใช้งาน"} /></Box><Button component={Link} href={`/portal/products/${p.id}`}>ดูรายละเอียด</Button></CardContent></Card>)}</Stack></>;
}
