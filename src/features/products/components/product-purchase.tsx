"use client";

import * as React from "react";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/features/cart/store";
import type { ProductDetail } from "@/lib/types";

export function ProductPurchase({ product }: { product: ProductDetail }) {
  const activeVariants = product.variants.filter((v) => v.isActive);
  const [variantId, setVariantId] = React.useState(
    activeVariants[0]?.id ?? "",
  );
  const [qty, setQty] = React.useState(1);
  // Sample option temporarily disabled.
  const [isSample] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  const add = useCart((s) => s.add);

  const selected = activeVariants.find((v) => v.id === variantId) ?? null;
  // Sample = a small fixed-volume try; here billed as the chosen ml variant
  // flagged as sample (admin can later define a dedicated sample price).
  const unitPrice = selected?.price ?? 0;
  const soldOut = product.soldOut;

  function onAdd() {
    if (!selected || soldOut) return;
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        variantId: selected.id,
        ml: selected.ml,
        unitPrice,
        image: product.image?.url ?? null,
        isSample,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Live price — updates with ml selection (requirement.md §3) */}
      <div className="flex items-end gap-3">
        <span className="font-serif text-3xl font-semibold">
          {formatPrice(unitPrice)}
        </span>
        {selected && (
          <span className="pb-1 text-sm text-muted-foreground">
            / {selected.ml}ml
          </span>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Хэмжээ сонгох</p>
        <div className="flex flex-wrap gap-2">
          {activeVariants.map((v) => {
            const active = v.id === variantId;
            return (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={cn(
                  "flex min-w-20 flex-col items-center rounded-lg px-4 py-2 transition-colors",
                  active ? "bg-foreground/30" : "bg-secondary hover:bg-accent",
                )}
              >
                <span className="text-sm font-semibold">{v.ml}ml</span>
                <span className="text-xs text-muted-foreground">
                  {formatPrice(v.price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sample option temporarily disabled.
      {product.sampleAvailable && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSample}
            onChange={(e) => setIsSample(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Sample болгож авах (туршилт)
        </label>
      )}
      */}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-md bg-secondary">
          <button
            className="px-3 py-2 hover:text-foreground"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Хасах"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center text-sm">{qty}</span>
          <button
            className="px-3 py-2 hover:text-foreground"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Нэмэх"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <Button
          size="lg"
          className="flex-1"
          disabled={soldOut || !selected}
          onClick={onAdd}
        >
          {added ? (
            <>
              <Check className="size-4" /> Нэмэгдлээ
            </>
          ) : soldOut ? (
            "Дууссан"
          ) : (
            <>
              <ShoppingBag className="size-4" /> Сагсанд нэмэх
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
