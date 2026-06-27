"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/features/cart/store";

export type ReorderItem = Omit<CartItem, "key" | "qty"> & { qty: number };

export function OrderActions({
  orderId,
  items,
  cancellable,
}: {
  orderId: string;
  items: ReorderItem[];
  cancellable: boolean;
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [busy, setBusy] = React.useState(false);

  function reorder() {
    for (const { qty, ...item } of items) {
      add(item, qty);
    }
    router.push("/cart");
  }

  async function cancel() {
    if (!confirm("Энэ захиалгыг цуцлах уу?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={reorder}>
        <RotateCcw className="size-4" /> Дахин захиалах
      </Button>
      {cancellable && (
        <Button variant="ghost" onClick={cancel} disabled={busy}>
          <XCircle className="size-4" /> Цуцлах
        </Button>
      )}
    </div>
  );
}
