import { z } from "zod";

export const couponSchema = z
  .object({
    code: z
      .string()
      .min(3, { message: "Coupon code must be at least 3 characters" })
      .max(50, { message: "Coupon code must be at most 50 characters" })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message: "Coupon code must contain only alphanumeric characters, dashes, or underscores",
      })
      .transform((val) => val.toUpperCase()),
    name: z.string().min(2, { message: "Name must be at least 2 characters" }).max(100),
    description: z.string().optional().or(z.literal("")).nullable(),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().min(1, { message: "Discount value must be at least 1" }),
    maxDiscount: z.number().min(0).optional().nullable(),
    minimumAmount: z.number().min(0).optional().nullable(),
    startAt: z.union([z.string(), z.date(), z.null()]).optional(),
    expiresAt: z.union([z.string(), z.date(), z.null()]).optional(),
    usageLimit: z.number().int().min(1).optional().nullable(),
    isActive: z.boolean().optional().default(true),
    courseIds: z.array(z.string().uuid()).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    }
  );

export type CouponInput = z.infer<typeof couponSchema>;
export type CreateCouponInput = CouponInput;
export type UpdateCouponInput = Partial<CouponInput>;
