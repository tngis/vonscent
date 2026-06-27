"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RestockControl({ productId }: { productId: string }) {
  const [amount, setAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function restock() {
    const delta = Number(amount);
    if (!delta) return;
    setBusy(true);
    try {
      await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, delta, reason: "restock" }),
      });
      setDone(true);
      setAmount("");
      setTimeout(() => setDone(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="ml"
        className="h-8 w-20"
      />
      <Button size="sm" variant="outline" onClick={restock} disabled={busy}>
        <Plus className="size-3.5" />
        {done ? "✓" : "Нөхөх"}
      </Button>
    </div>
  );
}
