import { z } from "zod";

export const reviewInputSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).default(""),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
