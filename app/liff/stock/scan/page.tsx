"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import { BarcodeScanner } from "@/components/stock/BarcodeScanner";

type Product = {
  id: string;
  barcode: string;
  product_name: string;
  unit_id: string;
  storage_location_id: string;
  min_stock_qty: number;
  price: number;
  cost: number;
};

type UnitOption = { id: string; unit_code: string; unit_name: string };
type LocationOption = { id: string; location_code: string; location_name: string };

export default function Page() {
  const [barcode, setBarcode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(true);
  const [tab, setTab] = useState<"receive" | "create">("receive");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);

  const [foundProduct, setFoundProduct] = useState<Product | null>(null);

  const [receive, setReceive] = useState({ qty: 1, unit_cost: 0, reference_no: "", remark: "" });
  const [createForm, setCreateForm] = useState({
    product_name: "",
    unit_id: "",
    storage_location_id: "",
    price: 0,
    cost: 0,
    min_stock_qty: 0,
    opening_balance: 0
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/units", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/locations", { cache: "no-store" }).then((r) => r.json())
    ]).then(([u, l]) => {
      const unitRows = Array.isArray(u) ? (u as UnitOption[]) : [];
      const locationRows = Array.isArray(l) ? (l as LocationOption[]) : [];
      setUnits(unitRows);
      setLocations(locationRows);
      if (locationRows.length > 0 && !selectedLocation) setSelectedLocation(locationRows[0]);
    });
  }, [selectedLocation]);

  const locationId = useMemo(() => selectedLocation?.id ?? "", [selectedLocation]);

  const detectBarcode = useCallback(async (value: string) => {
    const code = value.trim();
    if (!code) return;

    setBarcode(code);
    setScannerOpen(false);
    setMessage({ type: "info", text: `อ่านโค้ดสำเร็จ: ${code}` });

    const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`, { cache: "no-store" });
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const p = data[0] as Product;
      setFoundProduct(p);
      setTab("receive");

      if (p.storage_location_id) {
        const loc = locations.find((x) => x.id === p.storage_location_id);
        if (loc) setSelectedLocation(loc);
      }

      setReceive((s) => ({ ...s, unit_cost: p.cost ?? 0 }));
    } else {
      setFoundProduct(null);
      setTab("create");
      setCreateForm((s) => ({ ...s, product_name: "" }));
    }
  }, [locations]);

  const submitReceive = async () => {
    if (!foundProduct) return;
    if (!locationId) {
      setMessage({ type: "error", text: "กรุณาเลือกคลังสินค้า" });
      return;
    }

    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/stock/receive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product_id: foundProduct.id,
        location_id: locationId,
        quantity: Number(receive.qty),
        unit_cost: Number(receive.unit_cost) || 0,
        reference_no: receive.reference_no || null,
        remark: receive.remark || null
      })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data?.error ?? "บันทึกรับเข้าไม่สำเร็จ" });
      return;
    }

    setMessage({ type: "success", text: "บันทึกรับสินค้าเข้าสต๊อกเรียบร้อย" });
    setReceive({ qty: 1, unit_cost: receive.unit_cost, reference_no: "", remark: "" });
  };

  const submitCreate = async () => {
    if (!barcode) {
      setMessage({ type: "error", text: "กรุณาสแกนหรือกรอกรหัสก่อน" });
      return;
    }
    if (!createForm.product_name || !createForm.unit_id || !createForm.storage_location_id) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลสินค้าให้ครบ" });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        barcode,
        sku: barcode,
        product_name: createForm.product_name,
        unit_id: createForm.unit_id,
        price: Number(createForm.price) || 0,
        cost: Number(createForm.cost) || 0,
        storage_location_id: createForm.storage_location_id,
        min_stock_qty: Number(createForm.min_stock_qty) || 0,
        opening_balance: Number(createForm.opening_balance) || 0,
        active: true
      })
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data?.error ?? "บันทึกสินค้าใหม่ไม่สำเร็จ" });
      return;
    }

    setFoundProduct(data as Product);
    setTab("receive");
    setMessage({ type: "success", text: "สร้างสินค้าใหม่สำเร็จ" });
  };

  return (
    <Stack spacing={1.5}>
      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <QrCodeScannerRoundedIcon />
                <Typography variant="h6" fontWeight={700}>สแกนสินค้า</Typography>
              </Stack>
              <Button variant={scannerOpen ? "outlined" : "contained"} size="small" onClick={() => setScannerOpen((s) => !s)}>
                {scannerOpen ? "ซ่อนสแกนเนอร์" : "เปิดสแกนเนอร์"}
              </Button>
            </Stack>
            <TextField label="บาร์โค้ด / QR Code" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
            {scannerOpen ? <BarcodeScanner onDetected={detectBarcode} /> : null}
          </Stack>
        </CardContent>
      </Card>

      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      {foundProduct ? (
        <Card elevation={0} sx={{ border: "1px solid #d1fae5", borderRadius: 3, bgcolor: "#f0fdf4" }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography fontWeight={700}>{foundProduct.product_name}</Typography>
              <Chip size="small" color="success" label="พบสินค้าในระบบ" />
            </Stack>
            <Typography variant="body2" color="text.secondary">รหัส: {foundProduct.barcode}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab value="receive" label="รับเข้าสต๊อก" icon={<AddShoppingCartRoundedIcon />} iconPosition="start" />
            <Tab value="create" label="เพิ่มสินค้าใหม่" icon={<Inventory2RoundedIcon />} iconPosition="start" />
          </Tabs>

          <Divider sx={{ my: 2 }} />

          {tab === "receive" ? (
            <Stack spacing={1.2}>
              <Alert severity="info">ใช้สำหรับเพิ่มจำนวนสต๊อกจาก Barcode/QR ที่สแกนได้</Alert>
              <TextField label="สินค้า" value={foundProduct?.product_name ?? "ยังไม่พบสินค้า"} fullWidth disabled />

              <Autocomplete
                options={locations}
                value={selectedLocation}
                onChange={(_, value) => setSelectedLocation(value)}
                getOptionLabel={(o) => `${o.location_code} - ${o.location_name}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="คลังสินค้า" />}
              />

              <Stack direction="row" spacing={1}>
                <TextField label="จำนวนรับเข้า" type="number" value={receive.qty} onChange={(e) => setReceive((s) => ({ ...s, qty: Number(e.target.value) }))} fullWidth />
                <TextField label="ต้นทุนต่อหน่วย" type="number" value={receive.unit_cost} onChange={(e) => setReceive((s) => ({ ...s, unit_cost: Number(e.target.value) }))} fullWidth />
              </Stack>

              <TextField label="เลขที่อ้างอิง" value={receive.reference_no} onChange={(e) => setReceive((s) => ({ ...s, reference_no: e.target.value }))} fullWidth />
              <TextField label="หมายเหตุ" value={receive.remark} onChange={(e) => setReceive((s) => ({ ...s, remark: e.target.value }))} fullWidth multiline minRows={2} />

              <Box>
                <Button disabled={loading || !foundProduct} variant="contained" size="large" onClick={submitReceive}>บันทึกรับเข้า</Button>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={1.2}>
              <Alert severity="warning">ไม่พบสินค้า: สามารถสร้างสินค้าใหม่จากโค้ดที่สแกนได้ทันที</Alert>
              <TextField label="บาร์โค้ด" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
              <TextField label="ชื่อสินค้า" value={createForm.product_name} onChange={(e) => setCreateForm((s) => ({ ...s, product_name: e.target.value }))} fullWidth />

              <Autocomplete
                options={units}
                value={selectedUnit}
                onChange={(_, value) => {
                  setSelectedUnit(value);
                  setCreateForm((s) => ({ ...s, unit_id: value?.id ?? "" }));
                }}
                getOptionLabel={(o) => `${o.unit_code} - ${o.unit_name}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="หน่วยนับ" />}
              />

              <Autocomplete
                options={locations}
                value={selectedLocation}
                onChange={(_, value) => {
                  setSelectedLocation(value);
                  setCreateForm((s) => ({ ...s, storage_location_id: value?.id ?? "" }));
                }}
                getOptionLabel={(o) => `${o.location_code} - ${o.location_name}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="คลังเริ่มต้น" />}
              />

              <Stack direction="row" spacing={1}>
                <TextField label="ต้นทุน" type="number" value={createForm.cost} onChange={(e) => setCreateForm((s) => ({ ...s, cost: Number(e.target.value) }))} fullWidth />
                <TextField label="ราคาขาย" type="number" value={createForm.price} onChange={(e) => setCreateForm((s) => ({ ...s, price: Number(e.target.value) }))} fullWidth />
              </Stack>

              <Stack direction="row" spacing={1}>
                <TextField label="สต๊อกขั้นต่ำ" type="number" value={createForm.min_stock_qty} onChange={(e) => setCreateForm((s) => ({ ...s, min_stock_qty: Number(e.target.value) }))} fullWidth />
                <TextField label="ยอดยกมา" type="number" value={createForm.opening_balance} onChange={(e) => setCreateForm((s) => ({ ...s, opening_balance: Number(e.target.value) }))} fullWidth />
              </Stack>

              <Box>
                <Button disabled={loading} variant="contained" size="large" onClick={submitCreate}>บันทึกสินค้าใหม่</Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
