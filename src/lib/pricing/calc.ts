/**
 * ml-tier pricing core (development.md §5) — the central business function.
 *
 * The admin enters a full-bottle price and bottle capacity (ml); the price of
 * each decant size (5/10/20ml) is derived automatically with a per-tier
 * coefficient. Smaller decants carry a higher coefficient (extra labour +
 * packaging). Coefficients come from settings (admin A10), never hard-coded.
 *
 * All money is an integer number of ₮ (no floats stored). These functions
 * return integers, rounding the final price up to `roundTo`.
 */

export type Tier = {
  /** Decant size in millilitres. */
  ml: number;
  /** Multiplier applied on top of the linear per-ml cost. */
  coefficient: number;
};

export type TierPrice = {
  ml: number;
  /** Auto-computed price in integer ₮. */
  price: number;
};

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

/** Round a value UP to the nearest `step` (e.g. 100 → nearest 100₮). */
export function roundUpTo(value: number, step: number): number {
  if (step <= 0) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}

/**
 * Compute the auto price for a single decant size.
 * @returns integer ₮.
 */
export function calcTierPrice(
  bottlePrice: number,
  bottleMl: number,
  tier: Tier,
  roundTo = 100,
): number {
  if (!Number.isFinite(bottlePrice) || bottlePrice < 0) {
    throw new PricingError("bottlePrice must be a non-negative number");
  }
  if (!Number.isFinite(bottleMl) || bottleMl <= 0) {
    throw new PricingError("bottleMl must be a positive number");
  }
  if (!Number.isFinite(tier.ml) || tier.ml <= 0) {
    throw new PricingError("tier.ml must be a positive number");
  }
  if (!Number.isFinite(tier.coefficient) || tier.coefficient <= 0) {
    throw new PricingError("tier.coefficient must be a positive number");
  }

  const basePerMl = bottlePrice / bottleMl;
  const raw = basePerMl * tier.ml * tier.coefficient;
  return roundUpTo(raw, roundTo);
}

/**
 * Compute auto prices for every tier. Tiers are returned sorted by ml ascending.
 */
export function calcTierPrices(
  bottlePrice: number,
  bottleMl: number,
  tiers: readonly Tier[],
  roundTo = 100,
): TierPrice[] {
  return [...tiers]
    .sort((a, b) => a.ml - b.ml)
    .map((tier) => ({
      ml: tier.ml,
      price: calcTierPrice(bottlePrice, bottleMl, tier, roundTo),
    }));
}

/**
 * Resolve the price actually charged for a variant: a non-null admin override
 * wins over the auto-computed price (development.md §5). Override is trusted
 * as already an integer ₮.
 */
export function resolveVariantPrice(
  autoPrice: number,
  overridePrice: number | null | undefined,
): number {
  if (overridePrice != null) {
    if (!Number.isInteger(overridePrice) || overridePrice < 0) {
      throw new PricingError("overridePrice must be a non-negative integer");
    }
    return overridePrice;
  }
  return autoPrice;
}
