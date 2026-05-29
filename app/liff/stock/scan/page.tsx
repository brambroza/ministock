/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import { BarcodeScanner } from "@/components/stock/BarcodeScanner";
import { useLiff } from "@/lib/liff/provider";
import { normalizeImageUrl } from "@/lib/utils/image";

type Product = {
  id: string;
  barcode: string;
  product_name: string;
  image_url?: string | null;
  unit_id: string;
  storage_location_id: string;
  min_stock_qty: number;
  price: number;
  cost: number;
};

type UnitOption = { id: string; unit_code: string; unit_name: string };
type LocationOption = { id: string; location_code: string; location_name: string };

export default function Page() {
  const { initialized } = useLiff();
  const [barcode, setBarcode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(true);
  const [isLineBrowser, setIsLineBrowser] = useState(false);
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [tab, setTab] = useState<"receive" | "create">("receive");
  const [autoContinue, setAutoContinue] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [bootError, setBootError] = useState("");

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [receiveLocationId, setReceiveLocationId] = useState("");

  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiveErrors, setReceiveErrors] = useState<{ qty?: string; location_id?: string }>({});
  const [createErrors, setCreateErrors] = useState<{ product_name?: string; unit_id?: string; storage_location_id?: string }>({});

  const [receive, setReceive] = useState({ qty: 1, unit_cost: 0, reference_no: "scan-in", remark: "manual" });
  const [createForm, setCreateForm] = useState({
    product_name: "",
    unit_id: "",
    storage_location_id: "",
    price: 0,
    cost: 0,
    min_stock_qty: 0,
    opening_balance: 0,
    image_url: ""
  });

  const prepareNextScan = useCallback(() => {
    setBarcode("");
    setFoundProduct(null);
    setModeDialogOpen(false);
    setReceiveErrors({});
    setCreateErrors({});
    setScannerOpen(true);
    setTab("receive");
    setReceive((s) => ({ ...s, qty: 1, reference_no: "", remark: "" }));
    setCreateForm((s) => ({
      ...s,
      product_name: "",
      opening_balance: 0,
      image_url: ""
    }));
  }, []);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "อัปโหลดรูปไม่สำเร็จ");
      setCreateForm((s) => ({ ...s, image_url: data.publicUrl ?? "" }));
    } catch {
      setMessage({ type: "error", text: "อัปโหลดรูปไม่สำเร็จ" });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    setIsLineBrowser(/Line\//i.test(navigator.userAgent));
    fetch("/api/liff/bootstrap", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
      if (!Array.isArray(payload?.units)) {
        setBootError(payload?.error ?? "โหลดหน่วยนับไม่สำเร็จ");
      }
      if (!Array.isArray(payload?.locations)) {
        setBootError(payload?.error ?? "โหลดคลังสินค้าไม่สำเร็จ");
      }
      const unitRows = Array.isArray(payload?.units) ? (payload.units as UnitOption[]) : [];
      const locationRows = Array.isArray(payload?.locations) ? (payload.locations as LocationOption[]) : [];
      setUnits(unitRows);
      setLocations(locationRows);
      if (locationRows.length > 0) {
        setReceiveLocationId((prev) => prev || locationRows[0].id);
      }
      if (unitRows.length > 0) {
        setCreateForm((s) => ({ ...s, unit_id: s.unit_id || unitRows[0].id }));
      }
      if (locationRows.length > 0) {
        setCreateForm((s) => ({ ...s, storage_location_id: s.storage_location_id || locationRows[0].id }));
      }
      })
      .catch(() => {
        setBootError("โหลดข้อมูลตั้งต้นไม่สำเร็จ");
      });
  }, [initialized]);

  const locationId = useMemo(() => receiveLocationId ?? "", [receiveLocationId]);

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
        setReceiveLocationId(p.storage_location_id);
      }

      setReceive((s) => ({ ...s, unit_cost: p.cost ?? 0 }));
      setModeDialogOpen(true);
    } else {
      setFoundProduct(null);
      setTab("create");
      setCreateForm((s) => ({ ...s, product_name: "" }));
      setModeDialogOpen(true);
    }
  }, []);

  const submitReceive = async () => {
    if (!foundProduct) return;
    const nextErrors: { qty?: string; location_id?: string } = {};
    if (!locationId) nextErrors.location_id = "กรุณาเลือกคลังสินค้า";
    if (!Number.isFinite(Number(receive.qty)) || Number(receive.qty) <= 0) nextErrors.qty = "จำนวนรับเข้าต้องมากกว่า 0";

    setReceiveErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลบังคับให้ครบ" });
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
    if (autoContinue) {
      prepareNextScan();
      setMessage({ type: "success", text: "บันทึกเรียบร้อย พร้อมสแกนชิ้นถัดไป" });
    }
  };

  const submitCreate = async () => {
    const nextErrors: { product_name?: string; unit_id?: string; storage_location_id?: string } = {};
    if (!barcode) {
      setMessage({ type: "error", text: "กรุณาสแกนหรือกรอกรหัสก่อน" });
      return;
    }
    if (!createForm.product_name.trim()) nextErrors.product_name = "กรุณากรอกชื่อสินค้า";
    if (!createForm.unit_id) nextErrors.unit_id = "กรุณาเลือกหน่วยนับ";
    if (!createForm.storage_location_id) nextErrors.storage_location_id = "กรุณาเลือกคลังเริ่มต้น";

    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
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
        image_url: createForm.image_url || null,
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
    setMessage({ type: "success", text: "สร้างสินค้าใหม่สำเร็จ กรุณากรอกจำนวนแล้วบันทึกรับเข้า" });
  }; 

  return (
    <Stack spacing={1.5}>
      <Dialog
        open={modeDialogOpen}
        onClose={() => setModeDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4, p: 0.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>เลือกการทำงาน</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2}>
            <Button
              variant={tab === "receive" ? "contained" : "outlined"}
              size="large"
              startIcon={<AddShoppingCartRoundedIcon />}
              onClick={() => {
                setTab("receive");
                setModeDialogOpen(false);
              }}
              sx={{ borderRadius: 3, justifyContent: "flex-start", py: 1.2 }}
            >
              รับเข้าสต๊อก
            </Button>
            <Button
              variant={tab === "create" ? "contained" : "outlined"}
              size="large"
              startIcon={<Inventory2RoundedIcon />}
              onClick={() => {
                setTab("create");
                setModeDialogOpen(false);
              }}
              sx={{ borderRadius: 3, justifyContent: "flex-start", py: 1.2 }}
            >
              เพิ่มสินค้าใหม่
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

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
            <Button variant="outlined" onClick={() => setModeDialogOpen(true)} sx={{ borderRadius: 2.5 }}>
              เลือกโหมดการทำงาน
            </Button>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                clickable
                color={autoContinue ? "success" : "default"}
                variant={autoContinue ? "filled" : "outlined"}
                label={autoContinue ? "โหมดต่อเนื่อง: เปิด" : "โหมดต่อเนื่อง: ปิด"}
                onClick={() => setAutoContinue((v) => !v)}
              />
              <Button size="small" variant="text" onClick={prepareNextScan}>สแกนชิ้นถัดไป</Button>
            </Stack>
            <TextField label="บาร์โค้ด / QR Code" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
            {scannerOpen ? <BarcodeScanner onDetected={detectBarcode} /> : null}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: "1px dashed #cbd5e1", borderRadius: 3, bgcolor: "#f8fafc" }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography fontWeight={700}>เพิ่มสินค้าแบบ Manual</Typography>
            <Typography variant="body2" color="text.secondary">
              ใช้กรณีไม่มีบาร์โค้ด/กล้องไม่สะดวก สามารถกรอกรหัสสินค้าและข้อมูลสินค้าได้ทันที
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => {
                  setTab("create");
                  setModeDialogOpen(false);
                  setFoundProduct(null);
                  setScannerOpen(false);
                  setMessage({ type: "info", text: "เข้าสู่โหมดเพิ่มสินค้าแบบ Manual แล้ว" });
                }}
              >
                เพิ่มสินค้า Manual
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setTab("create");
                  setModeDialogOpen(false);
                  setScannerOpen(false);
                }}
              >
                เพิ่มต่อเนื่องแบบ Manual
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}
      {bootError ? <Alert severity="error">{bootError}</Alert> : null}

      {foundProduct ? (
        <Card elevation={0} sx={{ border: "1px solid #d1fae5", borderRadius: 3, bgcolor: "#f0fdf4" }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography fontWeight={700}>{foundProduct.product_name}</Typography>
              <Chip size="small" color="success" label="พบสินค้าในระบบ" />
            </Stack>
            <Typography variant="body2" color="text.secondary">รหัส: {foundProduct.barcode}</Typography>
            {foundProduct.image_url ? <img src={normalizeImageUrl(foundProduct.image_url) ?? undefined} alt={foundProduct.product_name} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid #d1d5db", marginTop: 8 }} /> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography fontWeight={700}>{tab === "receive" ? "รับเข้าสต๊อก" : "เพิ่มสินค้าใหม่"}</Typography>
            <Button size="small" onClick={() => setModeDialogOpen(true)}>เปลี่ยนโหมด</Button>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {tab === "receive" ? (
            <Stack spacing={1.2}>
              <Alert severity="info">ใช้สำหรับเพิ่มจำนวนสต๊อกจาก Barcode/QR ที่สแกนได้</Alert>
              <TextField label="สินค้า" value={foundProduct?.product_name ?? "ยังไม่พบสินค้า"} fullWidth disabled />

              <TextField
                select
                label="คลังสินค้า *"
                value={receiveLocationId}
                onChange={(e) => {
                  setReceiveLocationId(e.target.value);
                  setReceiveErrors((prev) => ({ ...prev, location_id: undefined }));
                }}
                error={Boolean(receiveErrors.location_id)}
                helperText={receiveErrors.location_id}
                fullWidth
                SelectProps={isLineBrowser ? { native: true } : undefined}
              >
                {isLineBrowser ? <option value="">เลือกคลังสินค้า</option> : <MenuItem value="">เลือกคลังสินค้า</MenuItem>}
                {locations.map((o) => isLineBrowser ? (
                  <option key={o.id} value={o.id}>
                    {o.location_code} - {o.location_name}
                  </option>
                ) : (
                  <MenuItem key={o.id} value={o.id}>
                    {o.location_code} - {o.location_name}
                  </MenuItem>
                ))}
              </TextField>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="จำนวนรับเข้า *"
                  type="number"
                  value={receive.qty}
                  onChange={(e) => {
                    setReceive((s) => ({ ...s, qty: Number(e.target.value) }));
                    setReceiveErrors((prev) => ({ ...prev, qty: undefined }));
                  }}
                  error={Boolean(receiveErrors.qty)}
                  helperText={receiveErrors.qty}
                  fullWidth
                />
                <TextField label="ต้นทุนต่อหน่วย" type="number" value={receive.unit_cost} onChange={(e) => setReceive((s) => ({ ...s, unit_cost: Number(e.target.value) }))} fullWidth />
              </Stack>

              <TextField label="เลขที่อ้างอิง" value={receive.reference_no} onChange={(e) => setReceive((s) => ({ ...s, reference_no: e.target.value }))} fullWidth />
              <TextField label="หมายเหตุ" value={receive.remark} onChange={(e) => setReceive((s) => ({ ...s, remark: e.target.value }))} fullWidth multiline minRows={2} />

              <Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button disabled={loading || !foundProduct} variant="contained" size="large" onClick={submitReceive}>
                    {autoContinue ? "บันทึกและสแกนต่อ" : "บันทึกรับเข้า"}
                  </Button>
                  <Button disabled={loading} variant="outlined" size="large" onClick={prepareNextScan}>ล้างและสแกนใหม่</Button>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={1.2}>
              <Alert severity="warning">ไม่พบสินค้า: สามารถสร้างสินค้าใหม่จากโค้ดที่สแกนได้ทันที</Alert>
              <TextField label="บาร์โค้ด *" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
              <Button component="label" variant="outlined" disabled={uploading}>
                {uploading ? "กำลังอัปโหลดรูป..." : "อัปโหลดรูปสินค้า"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </Button>
              {createForm.image_url ? <img src={normalizeImageUrl(createForm.image_url) ?? undefined} alt="preview" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12, border: "1px solid #e5e7eb" }} /> : null}
              <TextField
                label="ชื่อสินค้า *"
                value={createForm.product_name}
                onChange={(e) => {
                  setCreateForm((s) => ({ ...s, product_name: e.target.value }));
                  setCreateErrors((prev) => ({ ...prev, product_name: undefined }));
                }}
                error={Boolean(createErrors.product_name)}
                helperText={createErrors.product_name}
                fullWidth
              />

              <TextField
                select
                label="หน่วยนับ *"
                value={createForm.unit_id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCreateForm((s) => ({ ...s, unit_id: nextId }));
                  setCreateErrors((prev) => ({ ...prev, unit_id: undefined }));
                }}
                error={Boolean(createErrors.unit_id)}
                helperText={createErrors.unit_id}
                fullWidth
                SelectProps={isLineBrowser ? { native: true } : undefined}
              >
                {isLineBrowser ? <option value="">เลือกหน่วยนับ</option> : <MenuItem value="">เลือกหน่วยนับ</MenuItem>}
                {units.map((o) => isLineBrowser ? (
                  <option key={o.id} value={o.id}>
                    {o.unit_code} - {o.unit_name}
                  </option>
                ) : (
                  <MenuItem key={o.id} value={o.id}>
                    {o.unit_code} - {o.unit_name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="คลังเริ่มต้น *"
                value={createForm.storage_location_id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCreateForm((s) => ({ ...s, storage_location_id: nextId }));
                  setCreateErrors((prev) => ({ ...prev, storage_location_id: undefined }));
                }}
                error={Boolean(createErrors.storage_location_id)}
                helperText={createErrors.storage_location_id}
                fullWidth
                SelectProps={isLineBrowser ? { native: true } : undefined}
              >
                {isLineBrowser ? <option value="">เลือกคลังเริ่มต้น</option> : <MenuItem value="">เลือกคลังเริ่มต้น</MenuItem>}
                {locations.map((o) => isLineBrowser ? (
                  <option key={o.id} value={o.id}>
                    {o.location_code} - {o.location_name}
                  </option>
                ) : (
                  <MenuItem key={o.id} value={o.id}>
                    {o.location_code} - {o.location_name}
                  </MenuItem>
                ))}
              </TextField>

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
