"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { BrowserMultiFormatReader } from "@zxing/browser";
import liff from "@line/liff";

export function BarcodeScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    if (videoRef.current) {
      reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result?.getText()) onDetected(result.getText());
      });
    }
    return () => reader.reset();
  }, [onDetected]);

  const scanLiff = async () => {
    try {
      const result = await liff.scanCodeV2();
      if (result.value) onDetected(result.value);
    } catch {
      // fallback to camera scanner
    }
  };

  return (
    <Stack spacing={2}>
      <Button variant="contained" onClick={scanLiff}>สแกนด้วย LIFF</Button>
      <Box component="video" ref={videoRef} sx={{ width: "100%", borderRadius: 2, bgcolor: "black", minHeight: 180 }} />
      <Typography>หรือกรอกบาร์โค้ด</Typography>
      <Stack direction="row" spacing={1}>
        <TextField fullWidth value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button onClick={() => onDetected(manual)} variant="outlined">ค้นหา</Button>
      </Stack>
    </Stack>
  );
}
