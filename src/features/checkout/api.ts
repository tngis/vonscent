import "server-only";
import { getProductById } from "@/features/products/api";
import { SHIPPING_ZONES, FREE_SHIP_OVER } from "@/lib/constants";
import type { CheckoutInput, OrderItemInput } from "@/lib/validators/order";

export interface PricedLine {
  productId: string;
  variantId: string;
  name: string;
  brand: string;
  ml: number;
  qty: number;
  isSample: boolean;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderSummary {
  lines: PricedLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
}

/**
 * Recompute every line's price from authoritative product data — never trust
 * prices sent by the client (development.md §7.5). Unknown items are skipped.
 */
export async function priceLines(
  items: OrderItemInput[],
): Promise<PricedLine[]> {
  const lines: PricedLine[] = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    if (!product) continue;
    const variant = product.variants.find((v) => v.id === item.variantId);
    if (!variant || !variant.isActive) continue;
    const unitPrice = variant.price;
    lines.push({
      productId: item.productId,
      variantId: item.variantId,
      name: product.name,
      brand: product.brand,
      ml: variant.ml,
      qty: item.qty,
      isSample: item.isSample,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    });
  }
  return lines;
}

export function shippingFeeFor(zone: string, subtotal: number): number {
  if (subtotal >= FREE_SHIP_OVER) return 0;
  const found = SHIPPING_ZONES.find((z) => z.name === zone);
  return found?.fee ?? SHIPPING_ZONES[0].fee;
}

export async function computeSummary(
  input: Pick<CheckoutInput, "items" | "shipZone">,
): Promise<OrderSummary> {
  const lines = await priceLines(input.items);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shippingFee = shippingFeeFor(input.shipZone, subtotal);
  // TODO(coupons): apply coupon discount via coupons table.
  const discount = 0;
  const total = Math.max(subtotal + shippingFee - discount, 0);
  return { lines, subtotal, shippingFee, discount, total };
}

export interface PlacedOrder {
  orderNo: string;
  total: number;
  paymentMethod: CheckoutInput["paymentMethod"];
}
