"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import Image from "next/image";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import Link from "next/link";
import type { Route } from "next";
import { AppSnackbar } from "@/components/common/AppSnackbar";

type OnHandRow = {
  product_id: string;
  barcode: string;
  product_name: string;
  unit_name: string | null;
  location_name: string | null;
  qty_on_hand: number;
  min_stock_qty: number;
  price: number;
  stock_value: number;
  status: "Normal" | "Low Stock" | "Out of Stock";
  image_url?: string | null;
};

export default function Page() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [rows, setRows] = useState<OnHandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
    open: false,
    message: "",
    severity: "info"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (productName.trim()) params.set("product_name", productName.trim());
      if (barcode.trim()) params.set("barcode", barcode.trim());
      if (status) params.set("status", status);

      const res = await fetch(`/api/stock/on-hand?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "ไม่สามารถโหลดข้อมูลสต๊อกคงเหลือได้");
        setRows([]);
        return;
      }
      if (!Array.isArray(data)) {
        setError("รูปแบบข้อมูลสต๊อกไม่ถูกต้อง");
        setRows([]);
        return;
      }
      setRows(data);
      setPage(0);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลสต๊อกคงเหลือได้");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [productName, barcode, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pagedRows = useMemo(() => {
    if (rowsPerPage === -1) return rows;
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const totalValue = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.stock_value ?? 0), 0),
    [rows]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" fontWeight={700}>สต๊อกคงเหลือ</Typography>
        <IconButton
          aria-label="toggle-filter"
          onClick={() => setMobileFilterOpen((v) => !v)}
          sx={{ display: { xs: "inline-flex", sm: "none" }, border: "1px solid #e5e7eb", borderRadius: 2 }}
        >
          <FilterListRoundedIcon />
        </IconButton>
      </Stack>

      <Collapse in={!isMobile || mobileFilterOpen}>
        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField label="ค้นหาชื่อสินค้า" value={productName} onChange={(e) => setProductName(e.target.value)} fullWidth />
            <TextField label="บาร์โค้ด" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
            <TextField select label="สถานะ" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
              <option value="">ทั้งหมด</option>
              <option value="Normal">ปกติ</option>
              <option value="Low Stock">สต๊อกต่ำ</option>
              <option value="Out of Stock">สินค้าหมด</option>
            </TextField>
            <Stack direction="row" spacing={1}>
              <Chip
                label="ค้นหา"
                color="primary"
                onClick={() => {
                  void loadData();
                  if (isMobile) setMobileFilterOpen(false);
                }}
                clickable
              />
              <Chip
                label="ล้าง"
                onClick={() => {
                  setProductName("");
                  setBarcode("");
                  setStatus("");
                  setSnack({ open: true, message: "ล้างตัวกรองแล้ว", severity: "info" });
                  if (isMobile) setMobileFilterOpen(true);
                  setTimeout(() => void loadData(), 0);
                }}
                clickable
              />
            </Stack>
          </Stack>
        </Paper>
      </Collapse>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รูป</TableCell>
              <TableCell>สินค้า</TableCell>
              <TableCell>บาร์โค้ด</TableCell>
              <TableCell>คลัง</TableCell>
              <TableCell align="right">คงเหลือ</TableCell>
              <TableCell align="right">ขั้นต่ำ</TableCell>
              <TableCell align="right">ราคา</TableCell>
              <TableCell align="right">มูลค่า</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((r) => (
              <TableRow key={`${r.product_id}-${r.location_name}`} hover>
                <TableCell>
                  <Image
                    src={r.image_url ?? "https://placehold.co/48x48?text=-"}
                    alt={r.product_name}
                    width={48}
                    height={48}
                    unoptimized
                    style={{ borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }}
                  />
                </TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.barcode}</TableCell>
                <TableCell>{r.location_name ?? "-"}</TableCell>
                <TableCell align="right">{Number(r.qty_on_hand).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.min_stock_qty).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.price).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.stock_value).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={r.status === "Normal" ? "ปกติ" : r.status === "Low Stock" ? "สต๊อกต่ำ" : "สินค้าหมด"}
                    color={r.status === "Normal" ? "success" : r.status === "Low Stock" ? "warning" : "error"}
                  />
                </TableCell>
                <TableCell align="right">
                  <Link href={`/portal/stock/stock-card/${r.product_id}` as Route} style={{ color: "#0f766e", textDecoration: "none", fontWeight: 600 }}>
                    ดูการ์ดสต๊อก
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!loading && pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography color="text.secondary">ไม่พบข้อมูลสต๊อกคงเหลือ</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage === -1 ? rows.length || 1 : rowsPerPage}
          onRowsPerPageChange={(e) => {
            const v = Number(e.target.value);
            setRowsPerPage(v);
            setPage(0);
          }}
          rowsPerPageOptions={[
            { label: "10", value: 10 },
            { label: "15", value: 15 },
            { label: "25", value: 25 },
            { label: "ทั้งหมด", value: -1 }
          ]}
          labelRowsPerPage="แถวต่อหน้า"
        />
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5, p: 1.5 }}>
        <Typography variant="body2" color="text.secondary">มูลค่าสต๊อกรวมทั้งหมด</Typography>
        <Typography variant="h6" fontWeight={700}>{totalValue.toLocaleString()} บาท</Typography>
      </Paper>

      <AppSnackbar
        open={snack.open}
        message={snack.message}
        severity={snack.severity}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      />
    </Stack>
  );
}
