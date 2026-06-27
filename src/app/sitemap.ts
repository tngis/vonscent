import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { SEED_PRODUCTS } from "@/features/products/seed";
import { BLOG_POSTS } from "@/features/blog/seed";

async function productSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  if (supabase) {
    const { data } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true);
    const rows = (data as { slug: string }[] | null) ?? [];
    if (rows.length) return rows.map((r) => r.slug);
  }
  return SEED_PRODUCTS.map((p) => p.slug);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPaths = ["", "/catalog", "/about", "/contact", "/faq", "/blog"];
  const slugs = await productSlugs();

  return [
    ...staticPaths.map((p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
    })),
    ...slugs.map((slug) => ({
      url: `${base}/products/${slug}`,
      lastModified: new Date(),
    })),
    ...BLOG_POSTS.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.date),
    })),
  ];
}
