import "server-only";
import { cache } from "react";
import type {
  CatalogFilters,
  CatalogResult,
  ProductDetail,
  ProductListItem,
} from "@/lib/types";
import type { ScentFamily, Season, TagKind } from "@/db/types";
import { SEED_PRODUCTS } from "./seed";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Product data access (development.md §3 — features domain api).
 *
 * Reads live data from Supabase. When Supabase isn't configured it falls back
 * to the seed catalogue so the project still runs in demo mode.
 */

// ── DB row shapes (supabase client is untyped here; we map explicitly) ──────
interface DbVariant {
  id: string;
  ml: number;
  auto_price: number;
  override_price: number | null;
  is_active: boolean;
}
interface DbImage {
  url: string;
  alt: string | null;
  sort_order: number;
}
interface DbInventory {
  on_hand_ml: number;
  reserved_ml: number;
  is_sold_out: boolean;
}
interface DbProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
  gender: ProductDetail["gender"];
  concentration: ProductDetail["concentration"];
  scent_family: ScentFamily | null;
  season: Season | null;
  origin_country: string | null;
  release_year: number | null;
  bottle_ml: number;
  sample_available: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  product_images: DbImage[];
  product_variants: DbVariant[];
  inventory: DbInventory | DbInventory[] | null;
  product_tags: {
    tags: { slug: string; kind: TagKind } | { slug: string; kind: TagKind }[] | null;
  }[];
}

const SELECT = `
  id, slug, name, brand, description,
  notes_top, notes_heart, notes_base,
  gender, concentration, scent_family, season,
  origin_country, release_year, bottle_ml,
  sample_available, rating_avg, rating_count, created_at,
  product_images ( url, alt, sort_order ),
  product_variants ( id, ml, auto_price, override_price, is_active ),
  inventory ( on_hand_ml, reserved_ml, is_sold_out ),
  product_tags ( tags ( slug, kind ) )
`;

function mapProduct(row: DbProduct): ProductDetail {
  const variants = [...row.product_variants]
    .sort((a, b) => a.ml - b.ml)
    .map((v) => ({
      id: v.id,
      ml: v.ml,
      price: v.override_price ?? v.auto_price,
      isActive: v.is_active,
    }));

  const images = [...row.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ url: i.url, alt: i.alt ?? row.name }));

  const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  const availableMl = inv ? inv.on_hand_ml - inv.reserved_ml : 0;

  const activePrices = variants.filter((v) => v.isActive).map((v) => v.price);
  const startingPrice = activePrices.length ? Math.min(...activePrices) : 0;

  const tags = row.product_tags
    .map((pt) => (Array.isArray(pt.tags) ? pt.tags[0] : pt.tags)?.kind)
    .filter((k): k is TagKind => Boolean(k));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    gender: row.gender,
    concentration: row.concentration,
    scentFamily: row.scent_family,
    season: row.season,
    image: images[0] ?? null,
    images,
    startingPrice,
    tags,
    soldOut: inv?.is_sold_out || availableMl <= 0,
    sampleAvailable: row.sample_available,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
    createdAt: row.created_at,
    description: row.description,
    notesTop: row.notes_top,
    notesHeart: row.notes_heart,
    notesBase: row.notes_base,
    originCountry: row.origin_country,
    releaseYear: row.release_year,
    variants,
    availableMl,
    bottleMl: row.bottle_ml,
  };
}

/**
 * Fetch all active products (deduped per request via React cache). Falls back
 * to the seed catalogue when Supabase isn't configured.
 */
export const fetchProducts = cache(async (): Promise<ProductDetail[]> => {
  if (!isSupabaseConfigured) return SEED_PRODUCTS;
  const supabase = await createClient();
  if (!supabase) return SEED_PRODUCTS;

  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("is_active", true);

  if (error || !data) return [];
  return (data as unknown as DbProduct[]).map(mapProduct);
});

function toListItem(p: ProductDetail): ProductListItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    gender: p.gender,
    concentration: p.concentration,
    scentFamily: p.scentFamily,
    season: p.season,
    image: p.image,
    startingPrice: p.startingPrice,
    tags: p.tags,
    soldOut: p.soldOut,
    sampleAvailable: p.sampleAvailable,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    createdAt: p.createdAt,
  };
}

const DEFAULT_PER_PAGE = 12;

function sortProducts(
  items: ProductDetail[],
  sort: NonNullable<CatalogFilters["sort"]>,
): ProductDetail[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.startingPrice - b.startingPrice);
    case "price_desc":
      return copy.sort((a, b) => b.startingPrice - a.startingPrice);
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "popular":
      return copy.sort((a, b) => b.ratingCount - a.ratingCount);
    case "new":
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function getCatalog(
  filters: CatalogFilters = {},
): Promise<CatalogResult> {
  const {
    brand,
    gender,
    family,
    season,
    tags,
    ml,
    minPrice,
    maxPrice,
    search,
    sort = "new",
    page = 1,
    perPage = DEFAULT_PER_PAGE,
  } = filters;

  const all = await fetchProducts();

  let items = all.filter((p) => {
    if (brand?.length && !brand.includes(p.brand)) return false;
    if (gender?.length && !gender.includes(p.gender)) return false;
    if (family?.length && (!p.scentFamily || !family.includes(p.scentFamily)))
      return false;
    if (
      season?.length &&
      (!p.season || !(season.includes(p.season) || p.season === "all"))
    )
      return false;
    if (tags?.length && !tags.some((t) => p.tags.includes(t))) return false;
    if (ml?.length && !p.variants.some((v) => ml.includes(v.ml))) return false;
    if (minPrice != null && p.startingPrice < minPrice) return false;
    if (maxPrice != null && p.startingPrice > maxPrice) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${p.name} ${p.brand}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  items = sortProducts(items, sort);

  const total = items.length;
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage).map(toListItem);

  return { items: pageItems, total, page, perPage };
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const all = await fetchProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getProductById(
  id: string,
): Promise<ProductDetail | null> {
  const all = await fetchProducts();
  return all.find((p) => p.id === id) ?? null;
}

export async function getProductsByIds(
  ids: string[],
): Promise<ProductListItem[]> {
  if (!ids.length) return [];
  const all = await fetchProducts();
  const set = new Set(ids);
  return all.filter((p) => set.has(p.id)).map(toListItem);
}

/** Full detail shape (with variants) for several ids — used by bulk actions. */
export async function getProductDetailsByIds(
  ids: string[],
): Promise<ProductDetail[]> {
  if (!ids.length) return [];
  const all = await fetchProducts();
  const set = new Set(ids);
  return all.filter((p) => set.has(p.id));
}

export async function getRelated(
  slug: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const all = await fetchProducts();
  const product = all.find((p) => p.slug === slug);
  if (!product) return [];
  return all
    .filter(
      (p) =>
        p.slug !== slug &&
        (p.scentFamily === product.scentFamily || p.brand === product.brand),
    )
    .slice(0, limit)
    .map(toListItem);
}

export async function getNewArrivals(limit = 8): Promise<ProductListItem[]> {
  const all = await fetchProducts();
  return sortProducts(all, "new").slice(0, limit).map(toListItem);
}

export async function getBestSellers(limit = 8): Promise<ProductListItem[]> {
  const all = await fetchProducts();
  return all
    .filter((p) => p.tags.includes("hot"))
    .slice(0, limit)
    .map(toListItem);
}

export async function getOnSale(limit = 8): Promise<ProductListItem[]> {
  const all = await fetchProducts();
  return all
    .filter((p) => p.tags.includes("sale"))
    .slice(0, limit)
    .map(toListItem);
}

export async function getBrands(): Promise<string[]> {
  const all = await fetchProducts();
  return [...new Set(all.map((p) => p.brand))].sort();
}

/** Lowest and highest starting price across the catalogue (for the price slider). */
export async function getPriceBounds(): Promise<{ min: number; max: number }> {
  const all = await fetchProducts();
  const prices = all.map((p) => p.startingPrice).filter((n) => n > 0);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Full product list (detail shape) — used by admin server pages. */
export async function getAllProducts(): Promise<ProductDetail[]> {
  return fetchProducts();
}
