"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Custom confirmation dialog — a styled replacement for the native `confirm()`.
 *
 * Controlled-friendly but also usable imperatively: pass `open`/`onOpenChange`
 * to drive it yourself, or use the `trigger` element to open it. `onConfirm`
 * may be async; the confirm button shows a busy state until it resolves and the
 * dialog closes automatically on success.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title = "Та итгэлтэй байна уу?",
  description,
  confirmLabel = "Тийм",
  cancelLabel = "Болих",
  destructive = false,
  onConfirm,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={busy ? undefined : setOpen}>
      {trigger}
      <DialogContent className="max-w-sm gap-3">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <div className="mt-2 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? "Түр хүлээнэ үү…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
