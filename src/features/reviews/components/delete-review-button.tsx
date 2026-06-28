"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function DeleteReviewButton({
  reviewId,
  productId,
}: {
  reviewId: string;
  productId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function remove() {
    const res = await fetch(
      `/api/reviews?id=${reviewId}&productId=${productId}`,
      { method: "DELETE" },
    );
    if (res.ok) router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-destructive"
        aria-label="Сэтгэгдэл устгах"
      >
        <Trash2 className="size-3.5" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Сэтгэгдлээ устгах уу?"
        description="Энэ үйлдлийг буцаах боломжгүй."
        confirmLabel="Устгах"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
