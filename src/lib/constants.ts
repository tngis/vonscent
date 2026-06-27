/**
 * Centralized magic values (development.md §7.7).
 */

export const SITE = {
  name: "vonscent",
  domain: "vonscent.mn",
  url: "https://vonscent.mn",
  description:
    "Үнэртэнг бага хэмжээгээр (decant) туршиж сонгох дэлгүүр — 5/10/20ml багц.",
  tagline: "Үнэрээ ол",
} as const;

/** ml decant package sizes the store sells (requirement.md). */
export const ML_SIZES = [5, 10, 20] as const;
export type MlSize = (typeof ML_SIZES)[number];

/**
 * Default tiering coefficients for pricing. Smaller decants carry a higher
 * coefficient (extra decanting labour + packaging). In production these are
 * read from the `settings` table (admin A10) — these are only fallbacks.
 */
export const DEFAULT_PRICE_TIERS = [
  { ml: 5, coefficient: 1.8 },
  { ml: 10, coefficient: 1.5 },
  { ml: 20, coefficient: 1.3 },
] as const;

/** Round prices up to the nearest ₮ step. */
export const DEFAULT_ROUND_TO = 100;

/** Reserve hold (minutes) for orders awaiting payment before auto-release. */
export const RESERVE_TIMEOUT_MINUTES = 30;

export const GENDERS = ["male", "female", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export const CONCENTRATIONS = [
  "EDP",
  "EDT",
  "Parfum",
  "EDC",
  "Extrait",
  "Elixir",
] as const;
export type Concentration = (typeof CONCENTRATIONS)[number];

export const GENDER_LABEL: Record<Gender, string> = {
  male: "Эрэгтэй",
  female: "Эмэгтэй",
  unisex: "Unisex",
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Хүлээгдэж буй",
  confirmed: "Баталгаажсан",
  shipping: "Хүргэгдэж буй",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

/** Shipping zones (seed/fallback; production reads settings.shipping). */
export const SHIPPING_ZONES = [
  { name: "Улаанбаатар дотор", fee: 5000 },
  { name: "Орон нутаг", fee: 12000 },
] as const;

/** Free shipping when subtotal ≥ this. */
export const FREE_SHIP_OVER = 150000;

export const PAYMENT_METHODS = [
  { value: "qpay", label: "QPay (QR код)" },
  { value: "bank_transfer", label: "Банк шилжүүлэг" },
] as const;

export const SEASONS = ["spring", "summer", "autumn", "winter", "all"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Хавар",
  summer: "Зун",
  autumn: "Намар",
  winter: "Өвөл",
  all: "Бүх улирал",
};

export const ROLES = [
  "guest",
  "customer",
  "courier",
  "operator",
  "super_admin",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Зочин",
  customer: "Хэрэглэгч",
  courier: "Хүргэгч",
  operator: "Оператор",
  super_admin: "Супер админ",
};
