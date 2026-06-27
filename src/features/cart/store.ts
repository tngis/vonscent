"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  /** Stable line key: variantId (+ "-sample" when sample). */
  key: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  variantId: string;
  ml: number;
  unitPrice: number;
  qty: number;
  image: string | null;
  isSample: boolean;
}

export interface AppliedCoupon {
  code: string;
  discount: number;
}

interface CartState {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      coupon: null,
      add: (item, qty = 1) =>
        set((state) => {
          const key = `${item.variantId}${item.isSample ? "-sample" : ""}`;
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, key, qty }] };
        }),
      remove: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      setQty: (key, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
            .filter((i) => i.qty > 0),
        })),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: null }),
    }),
    { name: "vonscent-cart" },
  ),
);

/** Selectors */
export const selectCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.qty, 0);
export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
