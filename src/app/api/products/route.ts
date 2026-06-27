import { NextResponse } from "next/server";
import {
  getProductsByIds,
  getCatalog,
  getProductBySlug,
} from "@/features/products/api";

/**
 * Public product data for client components.
 *   /api/products?slug=<slug>         → one product (detail shape, with variants)
 *   /api/products?ids=<uuid>,<uuid>   → those products (list shape)
 *   /api/products                     → full catalogue (list shape)
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const slug = params.get("slug");
  if (slug) {
    const product = await getProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  }

  const ids = params.get("ids");
  if (ids) {
    const items = await getProductsByIds(ids.split(",").filter(Boolean));
    return NextResponse.json({ items });
  }

  const { items } = await getCatalog({ perPage: 200 });
  return NextResponse.json({ items });
}
