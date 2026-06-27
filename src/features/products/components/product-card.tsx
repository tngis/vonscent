import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import type { ProductListItem } from "@/lib/types";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { QuickAdd } from "./quick-add";

const TAG_LABEL: Record<string, string> = {
  new: "Шинэ",
  hot: "Эрэлттэй",
  sale: "Хямдрал",
};

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <div className="group relative flex flex-col">
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted transition-all duration-300 group-hover:border-gold-strong/40 group-hover:shadow-lift"
      >
        {product.image && (
          <Image
            src={product.image.url}
            alt={product.image.alt || product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {product.tags.map((t) => (
            <Badge
              key={t}
              variant={t}
              className="w-fit backdrop-blur-sm"
            >
              {TAG_LABEL[t]}
            </Badge>
          ))}
        </div>
        {product.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide">
              Дууссан
            </span>
          </div>
        )}
      </Link>

      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
        <WishlistButton productId={product.id} />
        {!product.soldOut && <QuickAdd product={product} />}
      </div>

      <div className="mt-3 flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {product.brand}
        </span>
        <Link
          href={`/products/${product.slug}`}
          className="font-serif text-base font-medium leading-tight transition-colors hover:text-primary"
        >
          {product.name}
        </Link>
        <span className="mt-1.5 text-sm font-semibold tracking-tight text-foreground/70">
          {formatPrice(product.startingPrice)}
        </span>
      </div>
    </div>
  );
}
