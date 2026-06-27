import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Review data access. Reviews are public content but reviewer names live in
 * `profiles` (owner/staff RLS), so reads go through the service-role client
 * when available to resolve display names; otherwise they fall back to anon.
 */

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
}

export interface RecentReview extends Review {
  productName: string;
  productSlug: string;
  brand: string;
}

interface ReviewJoin {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  products?: { name: string; slug: string; brand: string } | null;
}

async function readClient() {
  return createAdminClient() ?? (await createClient());
}

function mapReview(r: ReviewJoin): Review {
  return {
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
    authorName: r.profiles?.full_name?.trim() || "Хэрэглэгч",
    authorAvatar: r.profiles?.avatar_url ?? null,
  };
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await readClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("id, product_id, user_id, rating, body, created_at, profiles ( full_name, avatar_url )")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return ((data as unknown as ReviewJoin[] | null) ?? []).map(mapReview);
}

export async function getRecentReviews(limit = 6): Promise<RecentReview[]> {
  const supabase = await readClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, product_id, user_id, rating, body, created_at, profiles ( full_name, avatar_url ), products ( name, slug, brand )",
    )
    .not("body", "eq", "")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as unknown as ReviewJoin[] | null) ?? []).map((r) => ({
    ...mapReview(r),
    productName: r.products?.name ?? "",
    productSlug: r.products?.slug ?? "",
    brand: r.products?.brand ?? "",
  }));
}
