"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/features/products/components/product-card";
import { useWishlist } from "@/features/wishlist/store";
import type { ProductListItem } from "@/lib/types";

async function fetchByIds(ids: string[]): Promise<ProductListItem[]> {
  if (!ids.length) return [];
  const res = await fetch(`/api/products?ids=${ids.join(",")}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items: ProductListItem[] };
  return data.items;
}

export default function WishlistPage() {
  const ids = useWishlist((s) => s.ids);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist", ids],
    queryFn: () => fetchByIds(ids),
    enabled: mounted,
  });

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 font-serif text-3xl font-semibold">
        Хүслийн жагсаалт
      </h1>

      {!mounted || isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-24 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Жагсаалт хоосон байна</p>
            <p className="text-sm text-muted-foreground">
              Дуртай үнэртнээ ❤ дарж хадгалаарай.
            </p>
          </div>
          <Button asChild>
            <Link href="/catalog">Бараа үзэх</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
