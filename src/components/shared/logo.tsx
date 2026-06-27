import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "font-serif text-xl font-semibold tracking-tight text-foreground",
        className,
      )}
      aria-label={`${SITE.name} нүүр хуудас`}
    >
von<span className="text-gold">scent</span>
    </Link>
  );
}
