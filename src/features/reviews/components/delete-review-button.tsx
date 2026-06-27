"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteReviewButton({
  reviewId,
  productId,
}: {
  reviewId: string;
  productId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function remove() {
    if (!confirm("Сэтгэгдлээ устгах уу?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/reviews?id=${reviewId}&productId=${productId}`,
        { method: "DELETE" },
      );
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-muted-foreground hover:text-destructive"
      aria-label="Сэтгэгдэл устгах"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
