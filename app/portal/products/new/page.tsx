"use client";

import { Alert, Autocomplete, Button, Card, CardContent, Collapse, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarcodeScanner } from "@/components/stock/BarcodeScanner";

type UnitOption = { id: string; unit_code: string; unit_name: string };
type LocationOption = { id: string; location_code: string; location_name: string };

export default function Page() {
  const searchParams = useSearchParams();
  const initialBarcode = useMemo(() => searchParams.get("barcode") ?? "", [searchParams]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);

  const [form, setForm] = useState({
    barcode: initialBarcode,
    product_name: "",
    unit_id: "",
    price: 0,
    cost: 0,
    min_stock_qty: 0,
    opening_balance: 0,
    storage_location_id: ""
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/units", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/locations", { cache: "no-store" }).then((r) => r.json())
    ]).then(([unitData, locationData]) => {
      setUnits(Array.isArray(unitData) ? unitData : []);
      setLocations(Array.isArray(locationData) ? locationData : []);
    });
  }, []);

  const save = async () => {
    await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    location.href = "/portal/products";
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2.2}>
          <Typography variant="h6">เพิ่มสินค้าใหม่</Typography>
          <Alert severity="info">สามารถสแกนได้ทั้ง Barcode และ QR Code</Alert>

          <Button variant={scannerOpen ? "outlined" : "contained"} onClick={() => setScannerOpen((s) => !s)}>
            {scannerOpen ? "ปิดตัวสแกน" : "สแกนบาร์โค้ด/คิวอาร์โค้ด"}
          </Button>

          <Collapse in={scannerOpen}>
            <Card variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
              <BarcodeScanner
                onDetected={(value) => {
                  setForm((s) => ({ ...s, barcode: value }));
                  setScannerOpen(false);
                }}
              />
            </Card>
          </Collapse>

          <TextField
            label="บาร์โค้ด"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            fullWidth
          />
          <TextField
            label="ชื่อสินค้า"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            fullWidth
          />

          <Autocomplete
            options={units}
            value={selectedUnit}
            onChange={(_, value) => {
              setSelectedUnit(value);
              setForm((s) => ({ ...s, unit_id: value?.id ?? "" }));
            }}
            getOptionLabel={(option) => `${option.unit_code} - ${option.unit_name}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            autoHighlight
            clearOnBlur={false}
            blurOnSelect
            ListboxProps={{ style: { maxHeight: 280 } }}
            renderInput={(params) => <TextField {...params} label="รหัสหน่วยนับ" placeholder="พิมพ์ค้นหา เช่น PCS / ชิ้น" />}
          />

          <Autocomplete
            options={locations}
            value={selectedLocation}
            onChange={(_, value) => {
              setSelectedLocation(value);
              setForm((s) => ({ ...s, storage_location_id: value?.id ?? "" }));
            }}
            getOptionLabel={(option) => `${option.location_code} - ${option.location_name}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            autoHighlight
            clearOnBlur={false}
            blurOnSelect
            ListboxProps={{ style: { maxHeight: 280 } }}
            renderInput={(params) => <TextField {...params} label="รหัสคลังสินค้า" placeholder="พิมพ์ค้นหา เช่น MAIN / คลังหลัก" />}
          />

          <TextField label="ราคาขาย" type="number" onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} fullWidth />
          <TextField label="ต้นทุน" type="number" onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} fullWidth />
          <TextField label="สต๊อกขั้นต่ำ" type="number" onChange={(e) => setForm({ ...form, min_stock_qty: Number(e.target.value) })} fullWidth />
          <TextField label="ยอดยกมา" type="number" onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) })} fullWidth />

          <Button size="large" variant="contained" onClick={save}>บันทึก</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
