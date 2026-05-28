"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";

type InviteItem = {
  id: string;
  note: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string;
  active: boolean;
  created_at: string;
};

type LineLinks = {
  line_login_url: string;
  line_add_friend_url: string;
  line_msgapi_url: string;
  liff_dashboard_url: string;
};

export default function SharePage() {
  const [items, setItems] = useState<InviteItem[]>([]);
  const [lineLinks, setLineLinks] = useState<LineLinks | null>(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [lineJoinUrl, setLineJoinUrl] = useState("");
  const [role, setRole] = useState("STAFF");
  const [expireDays, setExpireDays] = useState(7);
  const [maxUses, setMaxUses] = useState(100);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch("/api/invite-links", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      setErr(payload?.error ?? "โหลดข้อมูลลิงก์ไม่สำเร็จ");
      return;
    }
    setItems(payload.items ?? []);
    setLineLinks(payload.line_links ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  const copy = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setMsg("คัดลอกลิงก์แล้ว");
  };

  const createInvite = async () => {
    setErr("");
    setMsg("");
    const res = await fetch("/api/invite-links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role_code: role, expire_days: Number(expireDays), max_uses: Number(maxUses) })
    });
    const payload = await res.json();
    if (!res.ok) {
      setErr(payload?.error ?? "สร้างลิงก์ไม่สำเร็จ");
      return;
    }
    setJoinUrl(payload?.links?.join_url ?? "");
    setLineJoinUrl(payload?.links?.line_login_join_url ?? "");
    setLineLinks({
      line_login_url: payload?.links?.line_login_url ?? "",
      line_add_friend_url: payload?.links?.line_add_friend_url ?? "",
      line_msgapi_url: payload?.links?.line_msgapi_url ?? "",
      liff_dashboard_url: payload?.links?.liff_dashboard_url ?? ""
    });
    setMsg("สร้างลิงก์สำเร็จ ส่งให้เพื่อนเข้าทีมได้ทันที");
    await load();
  };

  const activeCount = useMemo(() => items.filter((x) => x.active).length, [items]);

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h5" fontWeight={800}>แชร์ลิงก์ทีมงาน + LINE</Typography>
        <Typography color="text.secondary">คัดลอกลิงก์ส่งเพื่อน เพื่อเข้ามาใช้งานข้อมูลบริษัทเดียวกัน (สต๊อก/ยอดซื้อ/ค่าใช้จ่าย)</Typography>
      </Stack>

      {err ? <Alert severity="error">{err}</Alert> : null}
      {msg ? <Alert severity="success">{msg}</Alert> : null}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography fontWeight={700}>สร้างลิงก์เชิญเข้าทีม</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField select label="สิทธิ์เริ่มต้น" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="COMPANY_ADMIN">Company Admin</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="STAFF">Staff</MenuItem>
                <MenuItem value="VIEWER">Viewer</MenuItem>
              </TextField>
              <TextField label="อายุลิงก์ (วัน)" type="number" value={expireDays} onChange={(e) => setExpireDays(Number(e.target.value))} />
              <TextField label="จำนวนใช้งานสูงสุด" type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
              <Button variant="contained" onClick={createInvite}>สร้างลิงก์</Button>
            </Stack>

            {joinUrl ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LinkRoundedIcon fontSize="small" />
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{joinUrl}</Typography>
                  <Tooltip title="คัดลอกลิงก์เชิญ">
                    <IconButton onClick={() => copy(joinUrl)}><ContentCopyRoundedIcon /></IconButton>
                  </Tooltip>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LinkRoundedIcon fontSize="small" />
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{lineJoinUrl}</Typography>
                  <Tooltip title="คัดลอกลิงก์ LINE Login + Join">
                    <IconButton onClick={() => copy(lineJoinUrl)}><ContentCopyRoundedIcon /></IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography fontWeight={700}>ลิงก์ LINE พร้อมใช้งาน</Typography>
            <Divider />
            {[{ label: "เพิ่มเพื่อน LINE OA", value: lineLinks?.line_add_friend_url }, { label: "LINE Login", value: lineLinks?.line_login_url }, { label: "LINE Msg API (เปิดแชทกับ OA)", value: lineLinks?.line_msgapi_url }, { label: "LIFF Dashboard", value: lineLinks?.liff_dashboard_url }].map((x) => (
              <Stack key={x.label} direction="row" spacing={1} alignItems="center">
                <Typography sx={{ minWidth: 220 }} variant="body2">{x.label}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{x.value || "-"}</Typography>
                </Box>
                <IconButton onClick={() => copy(x.value ?? "")} disabled={!x.value}><ContentCopyRoundedIcon /></IconButton>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography fontWeight={700}>ลิงก์ที่สร้างล่าสุด</Typography>
            <Chip label={`ใช้งานอยู่ ${activeCount}`} size="small" color="success" />
          </Stack>
          <Stack spacing={1}>
            {items.map((it) => (
              <Card key={it.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: "12px !important" }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>#{it.id.slice(0, 8)} • หมดอายุ {new Date(it.expires_at).toLocaleString()}</Typography>
                    <Chip size="small" label={`ใช้ไป ${it.used_count}/${it.max_uses}`} />
                    <Chip size="small" label={it.active ? "active" : "inactive"} color={it.active ? "success" : "default"} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 ? <Typography color="text.secondary">ยังไม่มีลิงก์ที่สร้างไว้</Typography> : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
