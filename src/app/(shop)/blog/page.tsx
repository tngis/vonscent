import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { getBlogPosts } from "@/features/blog/api";

export const metadata: Metadata = {
  title: "Блог",
  description: "Үнэртний тухай гарын авлага, зөвлөмж, мэдээлэл.",
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const [featured, ...rest] = posts;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Блог</h1>
      <p className="mt-2 text-muted-foreground">
        Үнэр сонгох гарын авлага, зөвлөмж, түүх.
      </p>

      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mt-10 grid gap-6 md:grid-cols-2"
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={featured.cover}
              alt={featured.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <Badge variant="secondary" className="w-fit">
              {featured.category}
            </Badge>
            <h2 className="font-serif text-2xl font-semibold group-hover:text-primary">
              {featured.title}
            </h2>
            <p className="text-muted-foreground">{featured.excerpt}</p>
            <span className="text-sm text-muted-foreground">
              {formatDate(featured.date)}
            </span>
          </div>
        </Link>
      )}

      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={post.cover}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="mt-3 space-y-1">
              <Badge variant="secondary" className="w-fit">
                {post.category}
              </Badge>
              <h3 className="font-serif text-lg font-medium group-hover:text-primary">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              <span className="text-xs text-muted-foreground">
                {formatDate(post.date)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
