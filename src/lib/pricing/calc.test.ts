import { describe, it, expect } from "vitest";
import {
  calcTierPrice,
  calcTierPrices,
  resolveVariantPrice,
  roundUpTo,
  PricingError,
  type Tier,
} from "./calc";

const TIERS: Tier[] = [
  { ml: 5, coefficient: 1.8 },
  { ml: 10, coefficient: 1.5 },
  { ml: 20, coefficient: 1.3 },
];

describe("roundUpTo", () => {
  it("rounds up to the nearest step", () => {
    expect(roundUpTo(4501, 100)).toBe(4600);
    expect(roundUpTo(4500, 100)).toBe(4500);
    expect(roundUpTo(1, 100)).toBe(100);
  });
  it("ceils when step <= 0", () => {
    expect(roundUpTo(4.2, 0)).toBe(5);
  });
});

describe("calcTierPrice", () => {
  // 100ml bottle @ 200,000₮ => basePerMl = 2000₮
  it("computes 5ml tier with coefficient and rounding", () => {
    // 2000 * 5 * 1.8 = 18000
    expect(calcTierPrice(200_000, 100, TIERS[0])).toBe(18_000);
  });
  it("computes 10ml tier", () => {
    // 2000 * 10 * 1.5 = 30000
    expect(calcTierPrice(200_000, 100, TIERS[1])).toBe(30_000);
  });
  it("computes 20ml tier", () => {
    // 2000 * 20 * 1.3 = 52000
    expect(calcTierPrice(200_000, 100, TIERS[2])).toBe(52_000);
  });
  it("rounds up to roundTo step", () => {
    // basePerMl = 150000/50 = 3000; 3000*5*1.8 = 27000 (already round)
    // use awkward numbers: 175000/30 = 5833.33..; *5*1.8 = 52500 -> /100 ceil
    const p = calcTierPrice(175_000, 30, TIERS[0], 100);
    expect(p % 100).toBe(0);
    expect(p).toBe(52_500);
  });
  it("smaller decant is pricier per ml than larger", () => {
    const p5 = calcTierPrice(200_000, 100, TIERS[0]); // 18000 / 5 = 3600/ml
    const p20 = calcTierPrice(200_000, 100, TIERS[2]); // 52000 / 20 = 2600/ml
    expect(p5 / 5).toBeGreaterThan(p20 / 20);
  });
  it("throws on invalid inputs", () => {
    expect(() => calcTierPrice(-1, 100, TIERS[0])).toThrow(PricingError);
    expect(() => calcTierPrice(100, 0, TIERS[0])).toThrow(PricingError);
    expect(() => calcTierPrice(100, 100, { ml: 0, coefficient: 1 })).toThrow(
      PricingError,
    );
    expect(() => calcTierPrice(100, 100, { ml: 5, coefficient: 0 })).toThrow(
      PricingError,
    );
  });
});

describe("calcTierPrices", () => {
  it("returns all tiers sorted by ml ascending", () => {
    const out = calcTierPrices(200_000, 100, [TIERS[2], TIERS[0], TIERS[1]]);
    expect(out.map((t) => t.ml)).toEqual([5, 10, 20]);
    expect(out.map((t) => t.price)).toEqual([18_000, 30_000, 52_000]);
  });
});

describe("resolveVariantPrice", () => {
  it("uses auto price when no override", () => {
    expect(resolveVariantPrice(18_000, null)).toBe(18_000);
    expect(resolveVariantPrice(18_000, undefined)).toBe(18_000);
  });
  it("override wins over auto price", () => {
    expect(resolveVariantPrice(18_000, 16_500)).toBe(16_500);
  });
  it("allows override of 0", () => {
    expect(resolveVariantPrice(18_000, 0)).toBe(0);
  });
  it("rejects non-integer or negative override", () => {
    expect(() => resolveVariantPrice(1, 10.5)).toThrow(PricingError);
    expect(() => resolveVariantPrice(1, -5)).toThrow(PricingError);
  });
});
