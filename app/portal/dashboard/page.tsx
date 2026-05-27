import { Box } from "@mui/material";
import { PageHeader, StatCard } from "@/components/common/Common";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const [{ count: pCount }, { data: onhand }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("stock_on_hand_view").select("*")
  ]);

  const totalValue = (onhand ?? []).reduce((s, i) => s + Number(i.stock_value ?? 0), 0);
  const low = (onhand ?? []).filter((i) => i.status === "Low Stock").length;
  const out = (onhand ?? []).filter((i) => i.status === "Out of Stock").length;

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
      </Box>
    </>
  );
}
