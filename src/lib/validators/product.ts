import { z } from "zod";

export const variantDraftSchema = z.object({
  ml: z.number().int().positive(),
  coefficient: z.number().positive(),
  active: z.boolean(),
  override: z.number().int().nonnegative().nullable(),
});

export const productInputSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  gender: z.enum(["male", "female", "unisex"]),
  concentration: z.enum(["EDP", "EDT", "Parfum", "EDC", "Extrait", "Elixir"]),
  scentFamily: z.enum([
    "floral",
    "woody",
    "fresh",
    "oriental",
    "citrus",
    "spicy",
  ]),
  season: z
    .enum(["spring", "summer", "autumn", "winter", "all"])
    .nullable()
    .optional(),
  notesTop: z.array(z.string()).default([]),
  notesHeart: z.array(z.string()).default([]),
  notesBase: z.array(z.string()).default([]),
  description: z.string().default(""),
  originCountry: z.string().optional(),
  releaseYear: z.number().int().nullable().optional(),
  onHandMl: z.number().int().nonnegative(),
  lowStockMl: z.number().int().nonnegative(),
  bottlePrice: z.number().int().nonnegative(),
  bottleMl: z.number().int().positive(),
  variants: z.array(variantDraftSchema).min(1),
});

export type ProductInput = z.infer<typeof productInputSchema>;

/** Partial update for an existing product (admin A2 edit). */
export const productEditSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  concentration: z.enum(["EDP", "EDT", "Parfum", "EDC"]).optional(),
  scentFamily: z
    .enum(["floral", "woody", "fresh", "oriental", "citrus", "spicy"])
    .optional(),
  season: z
    .enum(["spring", "summer", "autumn", "winter", "all"])
    .nullable()
    .optional(),
  notesTop: z.array(z.string()).optional(),
  notesHeart: z.array(z.string()).optional(),
  notesBase: z.array(z.string()).optional(),
  description: z.string().optional(),
  originCountry: z.string().nullable().optional(),
  releaseYear: z.number().int().nullable().optional(),
  sampleAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.enum(["new", "hot", "sale"])).optional(),
  bottlePrice: z.number().int().nonnegative().optional(),
  bottleMl: z.number().int().positive().optional(),
  lowStockMl: z.number().int().nonnegative().optional(),
});

export type ProductEditInput = z.infer<typeof productEditSchema>;
