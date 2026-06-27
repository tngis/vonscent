"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CatalogPagination({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  function go(p: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`, { scroll: true });
  }

  return (
    <div className="mt-12 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        Өмнөх
      </Button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          className="w-9"
          onClick={() => go(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => go(page + 1)}
      >
        Дараах
      </Button>
    </div>
  );
}
