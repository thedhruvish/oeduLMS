import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { coupons, couponCourses } from "@oedulms/db/schema/coupons";
import { eq, and, sql, desc } from "@oedulms/db/dzl";
import { zValidator } from "@hono/zod-validator";
import { couponSchema } from "@oedulms/validator";
import type { AppVariables } from "../types";

export const adminCouponsRouter = new Hono<AppVariables>();

// GET /api/admin/coupons - List all coupons with their restricted course relations
adminCouponsRouter.get("/", async (c) => {
  const db = createDb();

  const allCoupons = await db.select().from(coupons).orderBy(desc(coupons.createdAt));

  const allRelations = await db
    .select({
      couponId: couponCourses.couponId,
      courseId: couponCourses.courseId,
    })
    .from(couponCourses);

  const relationsMap: Record<string, string[]> = {};
  for (const rel of allRelations) {
    (relationsMap[rel.couponId] ??= []).push(rel.courseId);
  }

  const result = allCoupons.map((coupon) => ({
    ...coupon,
    courseIds: relationsMap[coupon.id] || [],
  }));

  return c.json(result);
});

// GET /api/admin/coupons/:id - Fetch single coupon with details
adminCouponsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);

  if (!coupon) {
    return c.json({ error: "Coupon not found" }, 404);
  }

  const restrictedCourses = await db
    .select({ courseId: couponCourses.courseId })
    .from(couponCourses)
    .where(eq(couponCourses.couponId, id));

  return c.json({
    ...coupon,
    courseIds: restrictedCourses.map((r) => r.courseId),
  });
});

// POST /api/admin/coupons - Create coupon
adminCouponsRouter.post("/", zValidator("json", couponSchema), async (c) => {
  const user = c.get("sessionUser");
  const body = c.req.valid("json");
  const db = createDb();

  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.code, body.code))
    .limit(1);

  if (existing) {
    return c.json({ error: `Coupon code '${body.code}' already exists` }, 400);
  }

  const [newCoupon] = await db
    .insert(coupons)
    .values({
      code: body.code,
      name: body.name,
      description: body.description || null,
      discountType: body.discountType,
      discountValue:
        body.discountType === "FIXED" ? Math.round(body.discountValue * 100) : body.discountValue,
      maxDiscount: body.maxDiscount ? Math.round(body.maxDiscount * 100) : null,
      minimumAmount: body.minimumAmount ? Math.round(body.minimumAmount * 100) : null,
      startAt: body.startAt ? new Date(body.startAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      usageLimit: body.usageLimit || null,
      isActive: body.isActive ?? true,
      createdBy: user.id,
    })
    .returning();

  if (!newCoupon) {
    return c.json({ error: "Failed to create coupon" }, 500);
  }

  if (body.courseIds && body.courseIds.length > 0) {
    const courseRelations = body.courseIds.map((courseId) => ({
      couponId: newCoupon.id,
      courseId,
    }));
    await db.insert(couponCourses).values(courseRelations);
  }

  return c.json({
    ...newCoupon,
    courseIds: body.courseIds || [],
  });
});

// PUT /api/admin/coupons/:id - Update coupon
adminCouponsRouter.put("/:id", zValidator("json", couponSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = createDb();

  const [existingCoupon] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);

  if (!existingCoupon) {
    return c.json({ error: "Coupon not found" }, 404);
  }

  const [codeConflict] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.code, body.code), sql`${coupons.id} != ${id}`))
    .limit(1);

  if (codeConflict) {
    return c.json({ error: `Coupon code '${body.code}' already exists` }, 400);
  }

  const [updatedCoupon] = await db
    .update(coupons)
    .set({
      code: body.code,
      name: body.name,
      description: body.description || null,
      discountType: body.discountType,
      discountValue:
        body.discountType === "FIXED" ? Math.round(body.discountValue * 100) : body.discountValue,
      maxDiscount: body.maxDiscount ? Math.round(body.maxDiscount * 100) : null,
      minimumAmount: body.minimumAmount ? Math.round(body.minimumAmount * 100) : null,
      startAt: body.startAt ? new Date(body.startAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      usageLimit: body.usageLimit || null,
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, id))
    .returning();

  await db.delete(couponCourses).where(eq(couponCourses.couponId, id));

  if (body.courseIds && body.courseIds.length > 0) {
    const courseRelations = body.courseIds.map((courseId) => ({
      couponId: id,
      courseId,
    }));
    await db.insert(couponCourses).values(courseRelations);
  }

  return c.json({
    ...updatedCoupon,
    courseIds: body.courseIds || [],
  });
});

// DELETE /api/admin/coupons/:id - Delete coupon
adminCouponsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  const [deletedCoupon] = await db.delete(coupons).where(eq(coupons.id, id)).returning();

  if (!deletedCoupon) {
    return c.json({ error: "Coupon not found" }, 404);
  }

  return c.json({ success: true });
});
