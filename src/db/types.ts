/**
 * Database types.
 *
 * NOTE: In production this file is GENERATED via
 *   pnpm db:types   (supabase gen types typescript --local)
 * The hand-authored version below mirrors supabase/migrations/* so the app is
 * type-safe before a live database exists. Regenerate after any schema change
 * (development.md §7.4).
 */

export type Gender = "male" | "female" | "unisex";
export type Concentration =
  | "EDP"
  | "EDT"
  | "Parfum"
  | "EDC"
  | "Extrait"
  | "Elixir";
export type ScentFamily =
  | "floral"
  | "woody"
  | "fresh"
  | "oriental"
  | "citrus"
  | "spicy";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "qpay" | "bank_transfer";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type TagKind = "new" | "hot" | "sale";
export type Season = "spring" | "summer" | "autumn" | "winter" | "all";
export type CouponType = "percent" | "fixed";
export type UserRole =
  | "guest"
  | "customer"
  | "courier"
  | "operator"
  | "super_admin";

type WithDefaults<Row, Optional extends keyof Row> = Omit<Row, Optional> &
  Partial<Pick<Row, Optional>>;

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
  gender: Gender;
  concentration: Concentration;
  scent_family: ScentFamily | null;
  origin_country: string | null;
  release_year: number | null;
  season: Season | null;
  bottle_price: number;
  bottle_ml: number;
  sample_available: boolean;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  url: string;
  alt: string;
  sort_order: number;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  ml: number;
  auto_price: number;
  override_price: number | null;
  is_active: boolean;
}

export interface InventoryRow {
  product_id: string;
  on_hand_ml: number;
  reserved_ml: number;
  low_stock_ml: number;
  is_sold_out: boolean;
  updated_at: string;
}

export interface TagRow {
  id: string;
  slug: string;
  name: string;
  kind: TagKind;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  role: UserRole;
  loyalty_points: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressRow {
  id: string;
  user_id: string;
  label: string;
  recipient: string;
  phone: string;
  city: string;
  district: string | null;
  detail: string;
  is_default: boolean;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_no: string;
  user_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  ship_city: string;
  ship_district: string | null;
  ship_detail: string;
  ship_zone: string | null;
  note: string | null;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  loyalty_used: number;
  total: number;
  coupon_code: string | null;
  reserve_expires_at: string | null;
  qpay_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  brand: string;
  ml: number;
  unit_price: number;
  qty: number;
  is_sample: boolean;
  line_total: number;
}

export interface CouponRow {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WishlistRow {
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  category: string;
  tags: string[];
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HeroBannerRow {
  id: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  created_at: string;
}

export interface LoyaltyLedgerRow {
  id: string;
  user_id: string;
  order_id: string | null;
  delta: number;
  reason: string;
  created_at: string;
}

export interface OrderStatusHistoryRow {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string;
  changed_by: string | null;
  created_at: string;
}

type Table<Row, Optional extends keyof Row> = {
  Row: Row;
  Insert: WithDefaults<Row, Optional>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      products: Table<ProductRow, "id" | "created_at" | "updated_at">;
      product_images: Table<ProductImageRow, "id">;
      product_variants: Table<ProductVariantRow, "id">;
      inventory: Table<InventoryRow, "updated_at">;
      tags: Table<TagRow, "id">;
      profiles: Table<ProfileRow, "created_at" | "updated_at">;
      addresses: Table<AddressRow, "id" | "created_at">;
      orders: Table<OrderRow, "id" | "order_no" | "created_at" | "updated_at">;
      order_items: Table<OrderItemRow, "id">;
      coupons: Table<CouponRow, "id" | "created_at">;
      wishlists: Table<WishlistRow, "created_at">;
      reviews: Table<ReviewRow, "id" | "created_at">;
      settings: Table<SettingRow, "updated_at">;
      blog_posts: Table<
        BlogPostRow,
        "id" | "published_at" | "created_at" | "updated_at"
      >;
      faqs: Table<FaqRow, "id" | "created_at">;
      hero_banners: Table<HeroBannerRow, "id" | "created_at">;
      newsletter_subscribers: Table<NewsletterSubscriberRow, "id" | "created_at">;
      loyalty_ledger: Table<LoyaltyLedgerRow, "id" | "created_at">;
      order_status_history: Table<OrderStatusHistoryRow, "id" | "created_at">;
    };
    Views: Record<string, never>;
    Functions: {
      place_order: { Args: Record<string, unknown>; Returns: unknown };
      reserve_inventory: { Args: Record<string, unknown>; Returns: boolean };
      release_inventory: { Args: Record<string, unknown>; Returns: undefined };
      commit_inventory: { Args: Record<string, unknown>; Returns: undefined };
      mark_order_paid: { Args: Record<string, unknown>; Returns: undefined };
      cancel_order: { Args: Record<string, unknown>; Returns: undefined };
      restock_inventory: { Args: Record<string, unknown>; Returns: undefined };
      recompute_variant_prices: {
        Args: Record<string, unknown>;
        Returns: undefined;
      };
      validate_coupon: { Args: Record<string, unknown>; Returns: unknown };
      update_order_status: { Args: Record<string, unknown>; Returns: undefined };
      mark_order_refunded: { Args: Record<string, unknown>; Returns: undefined };
      recompute_rating: { Args: Record<string, unknown>; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
      gender_t: Gender;
      concentration_t: Concentration;
      scent_family_t: ScentFamily;
      order_status_t: OrderStatus;
      payment_method_t: PaymentMethod;
      payment_status_t: PaymentStatus;
      tag_kind_t: TagKind;
      coupon_type_t: CouponType;
    };
    CompositeTypes: Record<string, never>;
  };
}
