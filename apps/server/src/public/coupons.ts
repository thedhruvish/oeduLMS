import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { coupons, couponCourses } from "@oedulms/db/schema/coupons";
import { eq, and } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const publicCouponsRouter = new Hono<AppVariables>();

interface ValidateCouponPayload {
  code: string;
  courseId: string;
  coursePrice: number; // in INR
}

publicCouponsRouter.post("/validate", async (c) => {
  try {
    const payload = await c.req.json<ValidateCouponPayload>();
    const { code, courseId, coursePrice } = payload;

    if (!code || !courseId) {
      return c.json({ error: "Code and Course ID are required" }, 400);
    }

    const db = createDb();

    // Query the coupon details
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, code), eq(coupons.isActive, true)))
      .limit(1);

    if (!coupon) {
      return c.json({ valid: false, error: "Invalid or inactive coupon code" }, 400);
    }

    // Check expiration date
    const now = new Date();
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      return c.json({ valid: false, error: "Coupon code has expired" }, 400);
    }

    // Check usage limits
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return c.json({ valid: false, error: "Coupon usage limit reached" }, 400);
    }

    // Check minimum amount (convert from cents to INR if needed, but here we assume DB values are mapped)
    // Database minimumAmount is stored in cents, let's normalize to INR.
    const minAmountInINR = coupon.minimumAmount ? coupon.minimumAmount / 100 : 0;
    if (coursePrice < minAmountInINR) {
      return c.json(
        {
          valid: false,
          error: `Minimum purchase of ₹${minAmountInINR.toLocaleString()} required for this coupon`,
        },
        400
      );
    }

    // Check course restrictions
    const restrictions = await db
      .select()
      .from(couponCourses)
      .where(eq(couponCourses.couponId, coupon.id));

    if (restrictions.length > 0) {
      const isApplicable = restrictions.some((r) => r.courseId === courseId);
      if (!isApplicable) {
        return c.json({ valid: false, error: "This coupon is not applicable to this course" }, 400);
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (coursePrice * coupon.discountValue) / 100;
      if (coupon.maxDiscount !== null) {
        const maxDiscountInINR = coupon.maxDiscount / 100;
        if (discountAmount > maxDiscountInINR) {
          discountAmount = maxDiscountInINR;
        }
      }
    } else {
      discountAmount = coupon.discountValue / 100;
    }

    // Ensure discount doesn't exceed course price
    if (discountAmount > coursePrice) {
      discountAmount = coursePrice;
    }

    return c.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: Math.round(discountAmount),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return c.json({ error: message }, 500);
  }
});
