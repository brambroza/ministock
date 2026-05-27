"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { BrowserMultiFormatReader } from "@zxing/browser";
import liff from "@line/liff";

export function BarcodeScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectedRef = useRef<{ value: string; at: number } | null>(null);

  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string>("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | undefined;
    let unmounted = false;

    const applyFocusConstraints = async () => {
      const video = videoRef.current;
      const mediaStream = video?.srcObject;
      if (!(mediaStream instanceof MediaStream)) return;
      const [track] = mediaStream.getVideoTracks();
      if (!track) return;

      try {
        await track.applyConstraints({
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        });
      } catch {
        // Some LINE browser / devices do not support focusMode.
      }
    };

    const start = async () => {
      if (!videoRef.current) return;
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          const text = result?.getText()?.trim();
          if (!text) return;

          const now = Date.now();
          const last = lastDetectedRef.current;
          if (last && last.value === text && now - last.at < 1500) return;

          lastDetectedRef.current = { value: text, at: now };
          onDetectedRef.current(text);
        });
        await applyFocusConstraints();
      } catch {
        if (!unmounted) setCameraError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์กล้อง หรือใช้ปุ่มสแกน LIFF");
      }
    };

    void start();

    return () => {
      unmounted = true;
      if (controls?.stop) controls.stop();
    };
  }, []);

  const scanLiff = async () => {
    try {
      const result = await liff.scanCodeV2();
      if (result.value) onDetected(result.value.trim());
    } catch {
      setCameraError("การสแกนผ่าน LIFF ไม่สำเร็จ กรุณาลองใหม่ หรือสแกนผ่านกล้องด้านล่าง");
    }
  };

  return (
    <Stack spacing={1.2}>
      <Button variant="contained" onClick={scanLiff}>สแกนด้วย LIFF (QR/2D)</Button>
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        muted
        playsInline
        sx={{ width: "100%", borderRadius: 2, bgcolor: "black", minHeight: 220, objectFit: "cover" }}
      />
      {cameraError ? <Alert severity="warning">{cameraError}</Alert> : null}
      <Typography variant="body2" color="text.secondary">รองรับ Barcode 1D และ QR Code (fallback กรอกเอง)</Typography>
      <Stack direction="row" spacing={1}>
        <TextField fullWidth value={manual} onChange={(e) => setManual(e.target.value)} placeholder="กรอกรหัสสินค้า" />
        <Button onClick={() => onDetected(manual.trim())} variant="outlined" disabled={!manual.trim()}>ยืนยัน</Button>
      </Stack>
    </Stack>
  );
}
