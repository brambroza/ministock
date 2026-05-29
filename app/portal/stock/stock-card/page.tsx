"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Chip,
  Collapse,
  IconButton,
  Card,
  CardContent,
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
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import Link from "next/link";
import type { Route } from "next";
import dayjs from "dayjs";

type StockCardRow = {
  id: string;
  movement_date: string;
  movement_type: string;
  qty_in: number;
  qty_out: number;
  balance_qty: number;
  unit_cost: number;
  reference_no: string | null;
  remark: string | null;
  products: { id: string; product_name: string; barcode: string; image_url?: string | null }[] | null;
  storage_locations: { id: string; location_name: string }[] | null;
};

export default function Page() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [rows, setRows] = useState<StockCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [movementType, setMovementType] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/stock/stock-card", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "ไม่สามารถโหลดข้อมูลสต๊อกการ์ดได้");
          setRows([]);
          return;
        }
        if (!Array.isArray(data)) {
          setError("รูปแบบข้อมูลไม่ถูกต้อง");
          setRows([]);
          return;
        }
        setRows(data);
      } catch {
        setError("ไม่สามารถโหลดข้อมูลสต๊อกการ์ดได้");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const name = r.products?.[0]?.product_name ?? "";
      const barcode = r.products?.[0]?.barcode ?? "";
      const hitKeyword =
        keyword.trim() === "" ||
        name.toLowerCase().includes(keyword.toLowerCase()) ||
        barcode.toLowerCase().includes(keyword.toLowerCase()) ||
        (r.reference_no ?? "").toLowerCase().includes(keyword.toLowerCase());
      const hitType = movementType === "" || r.movement_type === movementType;
      return hitKeyword && hitType;
    });
  }, [rows, keyword, movementType]);

  const paged = useMemo(() => {
    if (rowsPerPage === -1) return filtered;
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" fontWeight={700}>สต๊อกการ์ด</Typography>
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
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
            <TextField label="ค้นหา (สินค้า/บาร์โค้ด/reference)" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} fullWidth />
            <TextField select label="ประเภท" value={movementType} onChange={(e) => { setMovementType(e.target.value); setPage(0); }} sx={{ minWidth: 220 }}>
              <option value="">ทั้งหมด</option>
              <option value="OPENING">OPENING</option>
              <option value="RECEIVE">RECEIVE</option>
              <option value="ISSUE">ISSUE</option>
              <option value="ADJUST_IN">ADJUST_IN</option>
              <option value="ADJUST_OUT">ADJUST_OUT</option>
              <option value="TRANSFER_IN">TRANSFER_IN</option>
              <option value="TRANSFER_OUT">TRANSFER_OUT</option>
            </TextField>
            <Chip
              label="ค้นหา"
              color="primary"
              onClick={() => {
                if (isMobile) setMobileFilterOpen(false);
              }}
              clickable
              sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
            />
          </Stack>
        </Paper>
      </Collapse>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ display: { xs: "none", sm: "block" }, border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>วันที่</TableCell>
              <TableCell>รูป</TableCell>
              <TableCell>สินค้า</TableCell>
              <TableCell>บาร์โค้ด</TableCell>
              <TableCell>คลัง</TableCell>
              <TableCell>ประเภท</TableCell>
              <TableCell align="right">เข้า</TableCell>
              <TableCell align="right">ออก</TableCell>
              <TableCell align="right">คงเหลือ</TableCell>
              <TableCell align="right">ต้นทุน</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>หมายเหตุ</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{dayjs(r.movement_date).format("DD/MM/YYYY HH:mm")}</TableCell>
                <TableCell>
                  <img
                    src={r.products?.[0]?.image_url ?? "https://placehold.co/48x48?text=-"}
                    alt={r.products?.[0]?.product_name ?? "product"}
                    style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }}
                  />
                </TableCell>
                <TableCell>{r.products?.[0]?.product_name ?? "-"}</TableCell>
                <TableCell>{r.products?.[0]?.barcode ?? "-"}</TableCell>
                <TableCell>{r.storage_locations?.[0]?.location_name ?? "-"}</TableCell>
                <TableCell><Chip size="small" label={r.movement_type} /></TableCell>
                <TableCell align="right">{Number(r.qty_in ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.qty_out ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.balance_qty ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(r.unit_cost ?? 0).toLocaleString()}</TableCell>
                <TableCell>{r.reference_no ?? "-"}</TableCell>
                <TableCell>{r.remark ?? "-"}</TableCell>
                <TableCell align="right">
                  {r.products?.[0]?.id ? (
                    <Link href={`/portal/stock/stock-card/${r.products[0].id}` as Route} style={{ textDecoration: "none", color: "#0f766e", fontWeight: 600 }}>
                      รายละเอียด
                    </Link>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))}
            {!loading && paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13}>
                  <Typography color="text.secondary">ไม่พบข้อมูลสต๊อกการ์ด</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Stack spacing={1.2} sx={{ display: { xs: "flex", sm: "none" } }}>
        {paged.map((r) => (
          <Card key={r.id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <img
                      src={r.products?.[0]?.image_url ?? "https://placehold.co/48x48?text=-"}
                      alt={r.products?.[0]?.product_name ?? "product"}
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }}
                    />
                    <Typography fontWeight={700}>{r.products?.[0]?.product_name ?? "-"}</Typography>
                  </Stack>
                  <Chip size="small" label={r.movement_type} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{dayjs(r.movement_date).format("DD/MM/YYYY HH:mm")}</Typography>
                <Typography variant="body2">บาร์โค้ด: {r.products?.[0]?.barcode ?? "-"}</Typography>
                <Typography variant="body2">คลัง: {r.storage_locations?.[0]?.location_name ?? "-"}</Typography>
                <Typography variant="body2">เข้า {Number(r.qty_in ?? 0).toLocaleString()} | ออก {Number(r.qty_out ?? 0).toLocaleString()} | คงเหลือ {Number(r.balance_qty ?? 0).toLocaleString()}</Typography>
                <Typography variant="body2">ต้นทุน: {Number(r.unit_cost ?? 0).toLocaleString()}</Typography>
                <Typography variant="body2">Ref: {r.reference_no ?? "-"}</Typography>
                <Typography variant="body2">หมายเหตุ: {r.remark ?? "-"}</Typography>
                {r.products?.[0]?.id ? (
                  <Link href={`/portal/stock/stock-card/${r.products[0].id}` as Route} style={{ color: "#0f766e", textDecoration: "none", fontWeight: 600 }}>
                    ดูรายละเอียด
                  </Link>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2.5 }}>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage === -1 ? filtered.length || 1 : rowsPerPage}
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
    </Stack>
  );
}
