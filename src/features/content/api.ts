import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { HeroBannerRow } from "@/db/types";

/**
 * Content / settings data access (admin A8 + A10). Settings live in the
 * key/value `settings` table; banners in `hero_banners`. Everything falls back
 * to sensible defaults so the storefront renders in demo mode.
 */

export interface PopupSlide {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  /** ISO date strings; null = no bound. Slide shows only inside this window. */
  startsAt: string | null;
  endsAt: string | null;
}

export interface PopupSettings {
  enabled: boolean;
  frequencyHours: number;
  slides: PopupSlide[];
}
export interface SocialSettings {
  instagram: string;
  facebook: string;
  phone: string;
  email: string;
}
export interface TeamMember {
  name: string;
  role: string;
  image: string;
}
export interface AboutSettings {
  story: string;
  values: { title: string; desc: string }[];
  team: TeamMember[];
}
export interface ShippingZone {
  name: string;
  fee: number;
}
export interface ShippingSettings {
  zones: ShippingZone[];
  freeOver: number;
}
export interface LoyaltySettings {
  earnPer: number;
  earnPoints: number;
  redeemRate: number;
}
export interface StoreSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export const DEFAULT_POPUP: PopupSettings = {
  enabled: false,
  frequencyHours: 24,
  slides: [],
};
export const DEFAULT_SOCIAL: SocialSettings = {
  instagram: "",
  facebook: "",
  phone: "",
  email: "hello@vonscent.mn",
};
export const DEFAULT_ABOUT: AboutSettings = {
  story: "",
  values: [],
  team: [],
};
export const DEFAULT_SHIPPING: ShippingSettings = {
  zones: [
    { name: "Улаанбаатар дотор", fee: 5000 },
    { name: "Орон нутаг", fee: 12000 },
  ],
  freeOver: 150000,
};
export const DEFAULT_LOYALTY: LoyaltySettings = {
  earnPer: 100,
  earnPoints: 1,
  redeemRate: 1,
};
export const DEFAULT_STORE: StoreSettings = {
  name: "vonscent",
  phone: "",
  email: "hello@vonscent.mn",
  address: "Улаанбаатар",
};

/** Fetch all settings rows once per request and index by key. */
const fetchSettings = cache(async (): Promise<Record<string, unknown>> => {
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase.from("settings").select("key, value");
  const out: Record<string, unknown> = {};
  for (const row of (data as { key: string; value: unknown }[] | null) ?? []) {
    out[row.key] = row.value;
  }
  return out;
});

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const all = await fetchSettings();
  const v = all[key];
  if (v == null || typeof v !== "object") return fallback;
  return { ...fallback, ...(v as object) } as T;
}

export const getPopupSettings = () => getSetting("popup", DEFAULT_POPUP);
export const getSocialSettings = () => getSetting("social", DEFAULT_SOCIAL);
export const getAboutSettings = () => getSetting("about", DEFAULT_ABOUT);
export const getShippingSettings = () =>
  getSetting("shipping", DEFAULT_SHIPPING);
export const getLoyaltySettings = () => getSetting("loyalty", DEFAULT_LOYALTY);
export const getStoreSettings = () => getSetting("store", DEFAULT_STORE);

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  sortOrder: number;
}

export async function getHeroBanners(): Promise<HeroBanner[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return ((data as HeroBannerRow[] | null) ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.cta_label,
    ctaHref: b.cta_href,
    imageUrl: b.image_url,
    sortOrder: b.sort_order,
  }));
}
