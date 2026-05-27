"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import liff from "@line/liff";

export function BarcodeScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectedRef = useRef<{ value: string; at: number } | null>(null);

  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string>("");
  const [liffReady, setLiffReady] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [busyImageDecode, setBusyImageDecode] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const checkLiff = async () => {
      try {
        setLiffReady(liff.isInClient() && liff.isApiAvailable("scanCodeV2"));
      } catch {
        setLiffReady(false);
      }
    };
    void checkLiff();
  }, []);

  useEffect(() => {
    if (!scannerEnabled) return;

    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E
    ]);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 100,
      delayBetweenScanSuccess: 600
    });

    let controls: { stop: () => void } | undefined;
    let unmounted = false;

    const start = async () => {
      if (!videoRef.current) return;
      try {
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoRef.current,
          (result) => {
            const text = result?.getText()?.trim();
            if (!text) return;

            const now = Date.now();
            const last = lastDetectedRef.current;
            if (last && last.value === text && now - last.at < 1500) return;

            lastDetectedRef.current = { value: text, at: now };
            onDetectedRef.current(text);
          }
        );
      } catch {
        if (!unmounted) {
          setCameraError("Live scanner ใช้งานไม่ได้บนอุปกรณ์นี้ ให้ใช้ปุ่ม 'ถ่ายรูป/เลือกรูปเพื่ออ่านโค้ด' แทน");
          setScannerEnabled(false);
        }
      }
    };

    void start();

    return () => {
      unmounted = true;
      if (controls?.stop) controls.stop();
    };
  }, [scannerEnabled]);

  const scanLiff = async () => {
    try {
      if (!liffReady) {
        setCameraError("อุปกรณ์นี้ไม่รองรับ LIFF scanCodeV2 ให้ใช้ถ่ายรูป/เลือกรูปแทน");
        return;
      }
      const result = await liff.scanCodeV2();
      if (result.value) onDetected(result.value.trim());
      else setCameraError("ไม่พบข้อมูลจาก LIFF scanCodeV2");
    } catch {
      setCameraError("การสแกนผ่าน LIFF ไม่สำเร็จ ให้ใช้ถ่ายรูป/เลือกรูปแทน");
    }
  };

  const decodeFromImageFile = async (file: File) => {
    setBusyImageDecode(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image-load-failed"));
      });

      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      const result = await reader.decodeFromImageElement(img);
      const text = result?.getText()?.trim();
      URL.revokeObjectURL(url);

      if (!text) {
        setCameraError("ไม่พบ Barcode/QR ในรูป กรุณาถ่ายให้ชัดขึ้นและเต็มกรอบ");
        return;
      }
      onDetected(text);
      setCameraError("");
    } catch {
      setCameraError("อ่านโค้ดจากรูปไม่สำเร็จ กรุณาถ่ายใหม่ให้โค้ดอยู่กลางภาพ");
    } finally {
      setBusyImageDecode(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={scanLiff} disabled={!liffReady}>สแกนด้วย LIFF</Button>
        <Button variant="outlined" onClick={() => fileRef.current?.click()} disabled={busyImageDecode}>
          ถ่ายรูป/เลือกรูปเพื่ออ่านโค้ด
        </Button>
      </Stack>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void decodeFromImageFile(file);
        }}
      />

      {scannerEnabled ? (
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
          sx={{
            width: "100%", borderRadius: 2, bgcolor: "black",
            minHeight: 300,
            objectFit: "cover",  
            objectPosition: "center",
          }}
        />
      ) : null}

      {busyImageDecode ? <Alert severity="info">กำลังอ่านโค้ดจากรูป...</Alert> : null}
      {cameraError ? <Alert severity="warning">{cameraError}</Alert> : null}

      <Typography variant="body2" color="text.secondary">
        หากสแกนสดไม่ติด ให้ใช้ปุ่มถ่ายรูป/เลือกรูป ซึ่งเสถียรกว่าใน LINE browser
      </Typography>

      <Stack direction="row" spacing={1}>
        <TextField fullWidth value={manual} onChange={(e) => setManual(e.target.value)} placeholder="กรอกรหัสสินค้า" />
        <Button onClick={() => onDetected(manual.trim())} variant="outlined" disabled={!manual.trim()}>ยืนยัน</Button>
      </Stack>
    </Stack>
  );
}
