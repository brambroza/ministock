"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useRouter } from "next/navigation";
import { AppSnackbar } from "@/components/common/AppSnackbar";

type Profile = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  line_user_id: string | null;
  line_display_name: string | null;
  line_picture_url: string | null;
};

type FormState = {
  display_name: string;
  email: string;
  phone: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "info" | "warning" | "error"; actionLabel?: string }>({
    open: false,
    message: "",
    severity: "info"
  });

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>({ display_name: "", email: "", phone: "" });
  const [initialForm, setInitialForm] = useState<FormState>({ display_name: "", email: "", phone: "" });
  const loadedRef = useRef(false);

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
        return;
      }

      const nextForm: FormState = {
        display_name: data?.display_name ?? "",
        email: data?.email ?? "",
        phone: data?.phone ?? ""
      };

      setProfile((prev) => {
        if (
          prev?.id === data?.id &&
          prev?.display_name === data?.display_name &&
          prev?.email === data?.email &&
          prev?.phone === data?.phone &&
          prev?.line_user_id === data?.line_user_id &&
          prev?.line_display_name === data?.line_display_name &&
          prev?.line_picture_url === data?.line_picture_url
        ) {
          return prev;
        }
        return data;
      });
      setForm((prev) => (
        prev.display_name === nextForm.display_name && prev.email === nextForm.email && prev.phone === nextForm.phone
          ? prev
          : nextForm
      ));
      setInitialForm((prev) => (
        prev.display_name === nextForm.display_name && prev.email === nextForm.email && prev.phone === nextForm.phone
          ? prev
          : nextForm
      ));
    } catch {
      setError("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadProfile();
  }, []);

  const isDirty = useMemo(
    () =>
      form.display_name !== initialForm.display_name ||
      form.email !== initialForm.email ||
      form.phone !== initialForm.phone,
    [form, initialForm]
  );

  const emailValid = form.email.trim() === "" || EMAIL_REGEX.test(form.email.trim());
  const canSave = !loading && !saving && !deleting && isDirty && form.display_name.trim().length > 0 && emailValid;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        display_name: form.display_name.trim(),
        email: form.email.trim() === "" ? null : form.email.trim(),
        phone: form.phone.trim() === "" ? null : form.phone.trim()
      };

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "บันทึกโปรไฟล์ไม่สำเร็จ");
        return;
      }

      const nextForm: FormState = {
        display_name: data?.display_name ?? "",
        email: data?.email ?? "",
        phone: data?.phone ?? ""
      };
      setProfile((prev) => {
        if (
          prev?.id === data?.id &&
          prev?.display_name === data?.display_name &&
          prev?.email === data?.email &&
          prev?.phone === data?.phone &&
          prev?.line_user_id === data?.line_user_id &&
          prev?.line_display_name === data?.line_display_name &&
          prev?.line_picture_url === data?.line_picture_url
        ) {
          return prev;
        }
        return data;
      });
      setForm((prev) => (
        prev.display_name === nextForm.display_name && prev.email === nextForm.email && prev.phone === nextForm.phone
          ? prev
          : nextForm
      ));
      setInitialForm((prev) => (
        prev.display_name === nextForm.display_name && prev.email === nextForm.email && prev.phone === nextForm.phone
          ? prev
          : nextForm
      ));
      setSuccess("บันทึกโปรไฟล์เรียบร้อย");
    } catch {
      setError("บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setForm(initialForm);
    setError("");
    setSuccess("");
  };

  const onDeactivate = async () => {
    setSnack({
      open: true,
      message: "กดยืนยันเพื่อปิดใช้งานบัญชี",
      severity: "warning",
      actionLabel: "ยืนยัน"
    });
  };

  const doDeactivate = async () => {
    setSnack((s) => ({ ...s, open: false }));

    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "ปิดใช้งานบัญชีไม่สำเร็จ");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("ปิดใช้งานบัญชีไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Stack minHeight={220} justifyContent="center" alignItems="center" spacing={1.5}>
            <CircularProgress size={28} />
            <Typography color="text.secondary">กำลังโหลดข้อมูลโปรไฟล์...</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardContent>
        <Stack spacing={2.2}>
          <Typography variant="h5" mb={0.5}>จัดการโปรไฟล์</Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={profile?.line_picture_url ?? undefined} sx={{ width: 64, height: 64 }}>
              {form.display_name?.charAt(0) || "U"}
            </Avatar>
            <Box>
              <Typography fontWeight={700}>{profile?.line_display_name || form.display_name || "ผู้ใช้งาน"}</Typography>
              <Typography variant="body2" color="text.secondary">LINE User ID: {profile?.line_user_id || "-"}</Typography>
            </Box>
          </Box>

          <TextField
            label="ชื่อที่แสดง"
            value={form.display_name}
            onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))}
            required
            fullWidth
          />

          <TextField
            label="อีเมล"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            error={!emailValid}
            helperText={!emailValid ? "รูปแบบอีเมลไม่ถูกต้อง" : " "}
            fullWidth
          />

          <TextField
            label="เบอร์โทร"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Button variant="contained" onClick={onSave} disabled={!canSave}>
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
            <Button variant="outlined" onClick={onReset} disabled={!isDirty || saving || deleting}>
              ยกเลิกการแก้ไข
            </Button>
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Danger Zone</Typography>
            <Button color="error" variant="outlined" onClick={onDeactivate} disabled={saving || deleting}>
              {deleting ? "กำลังปิดใช้งาน..." : "ปิดใช้งานบัญชีนี้"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
    <AppSnackbar
      open={snack.open}
      message={snack.message}
      severity={snack.severity}
      actionLabel={snack.actionLabel}
      onAction={snack.actionLabel ? doDeactivate : undefined}
      onClose={() => setSnack((s) => ({ ...s, open: false }))}
    />
    </>
  );
}
