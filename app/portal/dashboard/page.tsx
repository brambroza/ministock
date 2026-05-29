import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import dayjs from "dayjs";
import { PageHeader, StatCard } from "@/components/common/Common";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const prevMonthStart = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  const authUser = (await supabase.auth.getUser()).data.user;
  const { data: profile } = await supabase.from("user_profiles").select("company_id").eq("auth_user_id", authUser?.id).single();
  const companyId = profile?.company_id;

  const [{ count: pCount }, { data: onhand }, { data: expCurrent }, { data: expPrev }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("stock_on_hand_view").select("*"),
    companyId ? supabase.rpc("get_monthly_expense_summary", { p_company_id: companyId, p_month: monthStart }) : Promise.resolve({ data: [] }),
    companyId ? supabase.rpc("get_monthly_expense_summary", { p_company_id: companyId, p_month: prevMonthStart }) : Promise.resolve({ data: [] })
  ]);

  const totalValue = (onhand ?? []).reduce((s, i) => s + Number(i.stock_value ?? 0), 0);
  const low = (onhand ?? []).filter((i) => i.status === "Low Stock").length;
  const out = (onhand ?? []).filter((i) => i.status === "Out of Stock").length;
  const currentExpense = Number((Array.isArray(expCurrent) && expCurrent[0]?.total_expense) || 0);
  const prevExpense = Number((Array.isArray(expPrev) && expPrev[0]?.total_expense) || 0);
  const maxBar = Math.max(currentExpense, prevExpense, 1);
  const productIds = Array.from(new Set((onhand ?? []).map((i) => i.product_id).filter(Boolean)));
  const { data: productImages } = productIds.length
    ? await supabase.from("products").select("id,image_url").in("id", productIds)
    : { data: [] as { id: string; image_url: string | null }[] };
  const imageMap = new Map((productImages ?? []).map((p) => [p.id, p.image_url]));

  const available = (onhand ?? [])
    .filter((i) => Number(i.qty_on_hand ?? 0) > 0)
    .sort((a, b) => String(a.product_name ?? "").localeCompare(String(b.product_name ?? "")));

  return (
    <>
      <PageHeader title="แดชบอร์ด" subtitle="ภาพรวมระบบสต๊อก" />
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))"
          }
        }}
      >
        <StatCard title="จำนวนสินค้าทั้งหมด" value={pCount ?? 0} />
        <StatCard title="มูลค่าสต๊อก" value={totalValue.toFixed(2)} />
        <StatCard title="สต๊อกต่ำ" value={low} />
        <StatCard title="สินค้าหมด" value={out} />
        <StatCard title="ค่าใช้จ่ายเดือนนี้" value={`${currentExpense.toLocaleString()} บาท`} />
      </Box>

      <Paper elevation={0} sx={{ mt: 2, border: "1px solid #e5e7eb", borderRadius: 2.5, p: 2 }}>
        <Typography fontWeight={700} mb={1}>เปรียบเทียบค่าใช้จ่าย (เดือนนี้ vs เดือนก่อน)</Typography>
        <Stack spacing={1.2}>
          <Box>
            <Typography variant="body2" color="text.secondary">เดือนนี้ ({dayjs().format("MM/YYYY")})</Typography>
            <Box sx={{ height: 14, borderRadius: 999, bgcolor: "#e5e7eb", overflow: "hidden" }}>
              <Box sx={{ width: `${(currentExpense / maxBar) * 100}%`, height: "100%", bgcolor: "#06c755" }} />
            </Box>
            <Typography variant="body2" fontWeight={600}>{currentExpense.toLocaleString()} บาท</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">เดือนก่อน ({dayjs().subtract(1, "month").format("MM/YYYY")})</Typography>
            <Box sx={{ height: 14, borderRadius: 999, bgcolor: "#e5e7eb", overflow: "hidden" }}>
              <Box sx={{ width: `${(prevExpense / maxBar) * 100}%`, height: "100%", bgcolor: "#0ea5e9" }} />
            </Box>
            <Typography variant="body2" fontWeight={600}>{prevExpense.toLocaleString()} บาท</Typography>
          </Box>
        </Stack>
      </Paper>

      <Box mt={2}>
        <Typography variant="h6" fontWeight={700} mb={1}>รายการสินค้าคงเหลือ</Typography>

        <Paper elevation={0} sx={{ display: { xs: "none", md: "block" }, border: "1px solid #e5e7eb", borderRadius: 2.5, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>รูป</TableCell>
                <TableCell>สินค้า</TableCell>
                <TableCell>บาร์โค้ด</TableCell>
                <TableCell>คลัง</TableCell>
                <TableCell align="right">คงเหลือ</TableCell>
                <TableCell>หน่วย</TableCell>
                <TableCell>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {available.map((r) => (
                <TableRow key={`${r.product_id}-${r.location_name}`} hover>
                  <TableCell>
                    <img
                      src={imageMap.get(r.product_id) ?? "https://placehold.co/48x48?text=-"}
                      alt={r.product_name}
                      style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }}
                    />
                  </TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell>{r.barcode ?? "-"}</TableCell>
                  <TableCell>{r.location_name ?? "-"}</TableCell>
                  <TableCell align="right">{Number(r.qty_on_hand ?? 0).toLocaleString()}</TableCell>
                  <TableCell>{r.unit_name ?? "-"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status ?? "-"} color={r.status === "Low Stock" ? "warning" : "success"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1.2 }}>
          {available.map((r) => (
            <Card key={`${r.product_id}-${r.location_name}`} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
              <CardContent>
                <Stack direction="row" spacing={1.2} alignItems="center" mb={0.5}>
                  <img
                    src={imageMap.get(r.product_id) ?? "https://placehold.co/52x52?text=-"}
                    alt={r.product_name}
                    style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }}
                  />
                  <Typography fontWeight={700}>{r.product_name}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">บาร์โค้ด: {r.barcode ?? "-"}</Typography>
                <Typography variant="body2" color="text.secondary">คลัง: {r.location_name ?? "-"}</Typography>
                <Box mt={1} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>คงเหลือ {Number(r.qty_on_hand ?? 0).toLocaleString()} {r.unit_name ?? ""}</Typography>
                  <Chip size="small" label={r.status ?? "-"} color={r.status === "Low Stock" ? "warning" : "success"} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </>
  );
}
