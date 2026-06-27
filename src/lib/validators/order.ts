import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  ml: z.number().int().positive(),
  qty: z.number().int().positive().max(99),
  isSample: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  contactName: z.string().min(2, "Нэрээ оруулна уу"),
  contactPhone: z
    .string()
    .regex(/^\d{8}$/u, "8 оронтой утасны дугаар оруулна уу"),
  contactEmail: z.string().email("Имэйл буруу байна").optional().or(z.literal("")),
  shipCity: z.string().min(1).default("Улаанбаатар"),
  shipDistrict: z.string().optional(),
  shipDetail: z.string().min(3, "Хаягаа дэлгэрэнгүй оруулна уу"),
  shipZone: z.string().min(1, "Хүргэлтийн бүс сонгоно уу"),
  paymentMethod: z.enum(["qpay", "bank_transfer"]),
  note: z.string().max(500).optional(),
  couponCode: z.string().optional(),
  loyaltyUsed: z.number().int().nonnegative().default(0),
  saveAddress: z.boolean().default(false),
  items: z.array(orderItemSchema).min(1, "Сагс хоосон байна"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
