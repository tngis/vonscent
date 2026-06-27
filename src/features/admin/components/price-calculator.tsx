"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  calcTierPrice,
  resolveVariantPrice,
  type Tier,
} from "@/lib/pricing/calc";
import { DEFAULT_PRICE_TIERS, DEFAULT_ROUND_TO } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

export interface VariantDraft {
  ml: number;
  coefficient: number;
  active: boolean;
  override: number | null;
}

/**
 * Live ml-tier price preview (requirement.md A2, development.md §5).
 * Admin enters bottle price + capacity; 5/10/20ml prices compute automatically
 * and can be overridden per size. This is the same pricing core used everywhere.
 */
export function PriceCalculator({
  onChange,
}: {
  onChange?: (state: {
    bottlePrice: number;
    bottleMl: number;
    variants: VariantDraft[];
  }) => void;
}) {
  const [bottlePrice, setBottlePrice] = React.useState(480000);
  const [bottleMl, setBottleMl] = React.useState(100);
  const [variants, setVariants] = React.useState<VariantDraft[]>(
    DEFAULT_PRICE_TIERS.map((t) => ({
      ml: t.ml,
      coefficient: t.coefficient,
      active: true,
      override: null,
    })),
  );

  React.useEffect(() => {
    onChange?.({ bottlePrice, bottleMl, variants });
  }, [bottlePrice, bottleMl, variants, onChange]);

  const basePerMl =
    bottleMl > 0 ? Math.round(bottlePrice / bottleMl) : 0;

  function update(ml: number, patch: Partial<VariantDraft>) {
    setVariants((vs) =>
      vs.map((v) => (v.ml === ml ? { ...v, ...patch } : v)),
    );
  }

  function autoFor(v: VariantDraft): number {
    if (bottleMl <= 0 || bottlePrice < 0) return 0;
    const tier: Tier = { ml: v.ml, coefficient: v.coefficient };
    try {
      return calcTierPrice(bottlePrice, bottleMl, tier, DEFAULT_ROUND_TO);
    } catch {
      return 0;
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bp">Бүтэн савны үнэ (₮)</Label>
          <Input
            id="bp"
            type="number"
            inputMode="numeric"
            value={bottlePrice}
            onChange={(e) => setBottlePrice(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bml">Савны багтаамж (ml)</Label>
          <Input
            id="bml"
            type="number"
            inputMode="numeric"
            value={bottleMl}
            onChange={(e) => setBottleMl(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        1ml-ийн өртөг:{" "}
        <span className="font-medium text-foreground">
          {formatPrice(basePerMl)}
        </span>
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Багц</th>
              <th className="px-3 py-2 font-medium">Коэф.</th>
              <th className="px-3 py-2 font-medium">Авто үнэ</th>
              <th className="px-3 py-2 font-medium">Override</th>
              <th className="px-3 py-2 font-medium">Эцсийн</th>
              <th className="px-3 py-2 font-medium">Идэвх</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const auto = autoFor(v);
              const final = resolveVariantPrice(auto, v.override);
              return (
                <tr key={v.ml} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{v.ml}ml</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={v.coefficient}
                      onChange={(e) =>
                        update(v.ml, {
                          coefficient: Number(e.target.value) || 0,
                        })
                      }
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatPrice(auto)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      placeholder="—"
                      value={v.override ?? ""}
                      onChange={(e) =>
                        update(v.ml, {
                          override:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="h-8 w-28"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {formatPrice(final)}
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={v.active}
                      onCheckedChange={(c) =>
                        update(v.ml, { active: Boolean(c) })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Коэффициент тохиргооноос (A10) уншигдана. Override хийсэн үнэ авто
        тооцоог дарж, дахин бодоход хадгалагдана.
      </p>
    </div>
  );
}
