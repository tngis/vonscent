import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  OrderRow,
  OrderItemRow,
  OrderStatusHistoryRow,
  ProfileRow,
  CouponRow,
  HeroBannerRow,
  FaqRow,
  BlogPostRow,
} from "@/db/types";
import type { OrderStatus } from "@/lib/constants";

/**
 * Admin read access. Uses the cookie-bound client so staff RLS applies (admins
 * may read all orders / profiles via is_staff()). Returns empty data in demo.
 */

export interface DashboardData {
  salesToday: number;
  sales7d: number;
  sales30d: number;
  statusCounts: Record<OrderStatus, number>;
  recentOrders: OrderRow[];
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  const orders = (data as OrderRow[] | null) ?? [];

  const now = Date.now();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const paid = orders.filter((o) => o.payment_status === "paid");
  const sumSince = (ms: number) =>
    paid
      .filter((o) => new Date(o.created_at).getTime() >= ms)
      .reduce((s, o) => s + o.total, 0);

  const statusCounts = {
    pending: 0,
    confirmed: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  } as Record<OrderStatus, number>;
  for (const o of orders) statusCounts[o.status] += 1;

  void since;
  return {
    salesToday: sumSince(startToday.getTime()),
    sales7d: sumSince(now - 7 * 864e5),
    sales30d: sumSince(now - 30 * 864e5),
    statusCounts,
    recentOrders: orders.slice(0, 8),
  };
}

export async function getOrderDetail(id: string): Promise<{
  order: OrderRow;
  items: OrderItemRow[];
  history: OrderStatusHistoryRow[];
  customer: ProfileRow | null;
} | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  const order = data as OrderRow | null;
  if (!order) return null;

  const [{ data: items }, { data: history }, customer] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    order.user_id
      ? supabase.from("profiles").select("*").eq("id", order.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    order,
    items: (items as OrderItemRow[] | null) ?? [],
    history: (history as OrderStatusHistoryRow[] | null) ?? [],
    customer: (customer.data as ProfileRow | null) ?? null,
  };
}

export async function getCustomers(search?: string): Promise<ProfileRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (search) query = query.ilike("full_name", `%${search}%`);
  const { data } = await query.limit(200);
  return (data as ProfileRow[] | null) ?? [];
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  concentration: string;
  scentFamily: string | null;
  season: string | null;
  description: string;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  originCountry: string | null;
  releaseYear: number | null;
  bottlePrice: number;
  bottleMl: number;
  sampleAvailable: boolean;
  isActive: boolean;
  startingPrice: number;
  availableMl: number;
  lowStockMl: number;
  tags: string[];
}

const ADMIN_PRODUCT_SELECT = `
  id, slug, name, brand, gender, concentration, scent_family, season, description,
  notes_top, notes_heart, notes_base, origin_country, release_year,
  bottle_price, bottle_ml, sample_available, is_active,
  product_variants ( ml, auto_price, override_price, is_active ),
  inventory ( on_hand_ml, reserved_ml, low_stock_ml ),
  product_tags ( tags ( slug ) )
`;

interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  concentration: string;
  scent_family: string | null;
  season: string | null;
  description: string;
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
  origin_country: string | null;
  release_year: number | null;
  bottle_price: number;
  bottle_ml: number;
  sample_available: boolean;
  is_active: boolean;
  product_variants: {
    ml: number;
    auto_price: number;
    override_price: number | null;
    is_active: boolean;
  }[];
  inventory:
    | { on_hand_ml: number; reserved_ml: number; low_stock_ml: number }
    | { on_hand_ml: number; reserved_ml: number; low_stock_ml: number }[]
    | null;
  product_tags: { tags: { slug: string } | { slug: string }[] | null }[];
}

function mapAdminProduct(r: AdminProductRow): AdminProduct {
  const inv = Array.isArray(r.inventory) ? r.inventory[0] : r.inventory;
  const prices = r.product_variants
    .filter((v) => v.is_active)
    .map((v) => v.override_price ?? v.auto_price);
  const tags = r.product_tags
    .map((pt) => (Array.isArray(pt.tags) ? pt.tags[0] : pt.tags)?.slug)
    .filter((s): s is string => Boolean(s));
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    gender: r.gender,
    concentration: r.concentration,
    scentFamily: r.scent_family,
    season: r.season,
    description: r.description,
    notesTop: r.notes_top,
    notesHeart: r.notes_heart,
    notesBase: r.notes_base,
    originCountry: r.origin_country,
    releaseYear: r.release_year,
    bottlePrice: r.bottle_price,
    bottleMl: r.bottle_ml,
    sampleAvailable: r.sample_available,
    isActive: r.is_active,
    startingPrice: prices.length ? Math.min(...prices) : 0,
    availableMl: inv ? inv.on_hand_ml - inv.reserved_ml : 0,
    lowStockMl: inv?.low_stock_ml ?? 20,
    tags,
  };
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("created_at", { ascending: false });
  return ((data as unknown as AdminProductRow[] | null) ?? []).map(mapAdminProduct);
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return mapAdminProduct(data as unknown as AdminProductRow);
}

export async function getCustomerDetail(id: string): Promise<{
  profile: ProfileRow;
  orders: OrderRow[];
  ledger: { id: string; delta: number; reason: string; created_at: string }[];
} | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const profile = data as ProfileRow | null;
  if (!profile) return null;

  const [{ data: orders }, { data: ledger }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_ledger")
      .select("id, delta, reason, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    profile,
    orders: (orders as OrderRow[] | null) ?? [],
    ledger:
      (ledger as
        | { id: string; delta: number; reason: string; created_at: string }[]
        | null) ?? [],
  };
}

export async function getCoupons(): Promise<CouponRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as CouponRow[] | null) ?? [];
}

export interface ReportData {
  totalRevenue: number;
  paidOrders: number;
  topProducts: { name: string; brand: string; qty: number; revenue: number }[];
  topBrands: { brand: string; revenue: number }[];
}

export async function getReportData(): Promise<ReportData> {
  const supabase = await createClient();
  if (!supabase)
    return { totalRevenue: 0, paidOrders: 0, topProducts: [], topBrands: [] };

  // Only count items from paid orders.
  const { data } = await supabase
    .from("order_items")
    .select("product_name, brand, qty, line_total, orders!inner ( payment_status )")
    .eq("orders.payment_status", "paid");

  const rows =
    (data as unknown as {
      product_name: string;
      brand: string;
      qty: number;
      line_total: number;
    }[] | null) ?? [];

  const productMap = new Map<
    string,
    { name: string; brand: string; qty: number; revenue: number }
  >();
  const brandMap = new Map<string, number>();
  let totalRevenue = 0;

  for (const r of rows) {
    totalRevenue += r.line_total;
    const key = `${r.brand}|${r.product_name}`;
    const p = productMap.get(key) ?? {
      name: r.product_name,
      brand: r.brand,
      qty: 0,
      revenue: 0,
    };
    p.qty += r.qty;
    p.revenue += r.line_total;
    productMap.set(key, p);
    brandMap.set(r.brand, (brandMap.get(r.brand) ?? 0) + r.line_total);
  }

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("payment_status", "paid");

  return {
    totalRevenue,
    paidOrders: count ?? 0,
    topProducts: [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    topBrands: [...brandMap.entries()]
      .map(([brand, revenue]) => ({ brand, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

export async function getAllBanners(): Promise<HeroBannerRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("hero_banners")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data as HeroBannerRow[] | null) ?? [];
}

export async function getAllFaqs(): Promise<FaqRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data as FaqRow[] | null) ?? [];
}

export async function getAllBlogPosts(): Promise<BlogPostRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });
  return (data as BlogPostRow[] | null) ?? [];
}
