"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import liff from "@line/liff";

export function BarcodeScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectedRef = useRef<{ value: string; at: number } | null>(null);

  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string>("");
  const [liffReady, setLiffReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [usingRear, setUsingRear] = useState(true);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
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
      delayBetweenScanAttempts: 80,
      delayBetweenScanSuccess: 500
    });
    let controls: { stop: () => void } | undefined;
    let unmounted = false;

    const applyFocusConstraints = async () => {
      const video = videoRef.current;
      const mediaStream = video?.srcObject;
      if (!(mediaStream instanceof MediaStream)) return;
      const [track] = mediaStream.getVideoTracks();
      if (!track) return;

      try {
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[]; zoom?: { max?: number } };
        const advanced: MediaTrackConstraintSet[] = [];
        if (Array.isArray(capabilities?.focusMode) && capabilities.focusMode.includes("continuous")) {
          advanced.push({ focusMode: "continuous" } as unknown as MediaTrackConstraintSet);
        }
        if (capabilities?.zoom?.max && capabilities.zoom.max > 1) {
          advanced.push({ zoom: 1.2 } as unknown as MediaTrackConstraintSet);
        }

        await track.applyConstraints({
          advanced,
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
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: usingRear ? "environment" : "user" },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
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
        await applyFocusConstraints();

        const refocusTimer = setInterval(() => {
          void applyFocusConstraints();
        }, 1800);

        const oldStop = controls?.stop?.bind(controls);
        if (oldStop) {
          controls.stop = () => {
            clearInterval(refocusTimer);
            oldStop();
          };
        }
      } catch {
        if (!unmounted) setCameraError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์กล้อง หรือใช้ปุ่มสแกน LIFF");
      }
    };

    void start();

    return () => {
      unmounted = true;
      if (controls?.stop) controls.stop();
    };
  }, [usingRear]);

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

  const scanLiff = async () => {
    try {
      if (!liffReady) {
        setCameraError("อุปกรณ์นี้ไม่รองรับ LIFF scanCodeV2 จะใช้กล้องด้านล่างแทน");
        return;
      }
      const result = await liff.scanCodeV2();
      if (result.value) onDetected(result.value.trim());
    } catch {
      setCameraError("การสแกนผ่าน LIFF ไม่สำเร็จ ระบบสลับให้สแกนผ่านกล้องด้านล่างอัตโนมัติ");
    }
  };

  const toggleTorch = async () => {
    const mediaStream = videoRef.current?.srcObject;
    if (!(mediaStream instanceof MediaStream)) return;
    const [track] = mediaStream.getVideoTracks();
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet]
      });
      setTorchOn((s) => !s);
    } catch {
      setCameraError("อุปกรณ์นี้ไม่รองรับไฟแฟลชผ่านเบราว์เซอร์");
    }
  };

  return (
    <Stack spacing={1.2}>
      <Button variant="contained" onClick={scanLiff} disabled={!liffReady}>สแกนด้วย LIFF (QR/2D)</Button>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={() => setUsingRear((s) => !s)}>
          {usingRear ? "สลับกล้องหน้า" : "สลับกล้องหลัง"}
        </Button>
        <Button variant="outlined" onClick={toggleTorch}>{torchOn ? "ปิดไฟแฟลช" : "เปิดไฟแฟลช"}</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">กล้องเริ่มสแกนอัตโนมัติทันทีเมื่อเปิดหน้านี้</Typography>
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        muted
        playsInline
        sx={{ width: "100%", borderRadius: 2, bgcolor: "black", minHeight: 220, objectFit: "contain" }}
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
