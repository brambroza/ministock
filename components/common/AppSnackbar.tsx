"use client";

import { Alert, Button, Snackbar } from "@mui/material";

type Props = {
  open: boolean;
  message: string;
  severity?: "success" | "info" | "warning" | "error";
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function AppSnackbar({
  open,
  message,
  severity = "info",
  onClose,
  actionLabel,
  onAction
}: Props) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        variant="filled"
        severity={severity}
        onClose={onClose}
        sx={{ width: "100%", borderRadius: 2 }}
        action={
          actionLabel && onAction ? (
            <Button color="inherit" size="small" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : undefined
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
