import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type NotificationItem = {
  id: string;
  type: "RECEIVE" | "ISSUE" | "LOW_STOCK";
  title: string;
  message: string;
  created_at: string;
  href: string;
};

type MovementRow = {
  id: string;
  movement_type: "RECEIVE" | "ISSUE";
  created_at: string;
  qty_in: number | null;
  qty_out: number | null;
  products: Array<{ product_name: string | null }> | null;
};

type LowStockRow = {
  product_id: string;
  product_name: string;
  qty_on_hand: number;
  min_stock_qty: number;
};

export async function GET() {
  const supabase = await createClient();

  const [{ data: movements, error: movementError }, { data: lowStock, error: lowError }] = await Promise.all([
    supabase
      .from("stock_movements")
      .select("id,movement_type,created_at,qty_in,qty_out,products(product_name)")
      .in("movement_type", ["RECEIVE", "ISSUE"])
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("stock_on_hand_view")
      .select("product_id,product_name,qty_on_hand,min_stock_qty")
      .eq("status", "Low Stock")
      .limit(10)
  ]);

  if (movementError || lowError) {
    return NextResponse.json({ error: movementError?.message ?? lowError?.message }, { status: 400 });
  }

  const movementItems: NotificationItem[] = ((movements ?? []) as MovementRow[]).map((m) => {
    const isReceive = m.movement_type === "RECEIVE";
    const qty = isReceive ? Number(m.qty_in ?? 0) : Number(m.qty_out ?? 0);
    const productName = m.products?.[0]?.product_name ?? "ไม่ระบุสินค้า";
    return {
      id: `mv-${m.id}`,
      type: isReceive ? "RECEIVE" : "ISSUE",
      title: isReceive ? "รับเข้าสินค้า" : "เบิกสินค้า",
      message: `${productName} จำนวน ${qty}`,
      created_at: m.created_at,
      href: "/portal/stock/stock-card"
    };
  });

  const lowStockItems: NotificationItem[] = ((lowStock ?? []) as LowStockRow[]).map((s) => ({
    id: `low-${s.product_id}`,
    type: "LOW_STOCK",
    title: "สต๊อกใกล้หมด",
    message: `${s.product_name} คงเหลือ ${Number(s.qty_on_hand)} (ขั้นต่ำ ${Number(s.min_stock_qty)})`,
    created_at: new Date().toISOString(),
    href: "/portal/reports/low-stock"
  }));

  const items = [...lowStockItems, ...movementItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return NextResponse.json({ items, unreadCount: lowStockItems.length + Math.min(movementItems.length, 5) });
}
