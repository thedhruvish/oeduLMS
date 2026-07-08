import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, integer, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { courses } from "./courses";
import { payments } from "./payments";

// 1. Coupons Table
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // e.g. 'WELCOME50'
  name: text("name").notNull(),
  description: text("description"),
  discountType: text("discount_type").$type<"PERCENTAGE" | "FIXED">().notNull(),
  discountValue: integer("discount_value").notNull(), // standard discount value
  maxDiscount: integer("max_discount"), // Maximum discount for percentage coupons
  minimumAmount: integer("minimum_amount"), // Minimum order amount required
  startAt: timestamp("start_at"),
  expiresAt: timestamp("expires_at"),
  usageLimit: integer("usage_limit"), // Total allowed uses
  usedCount: integer("used_count").default(0).notNull(), // Current usage count
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 2. Coupon Courses Table (Junction Table for restricting coupons to specific courses) and when it not exsting any item it mean it apply all the courses
export const couponCourses = pgTable(
  "coupon_courses",
  {
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.couponId, table.courseId] })]
);

// 3. Coupon Redemptions Table (Usage tracking)
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  discountAmount: integer("discount_amount").notNull(), // The actual discount amount applied
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const couponsRelations = relations(coupons, ({ one, many }) => ({
  creator: one(user, {
    fields: [coupons.createdBy],
    references: [user.id],
  }),
  courses: many(couponCourses),
  redemptions: many(couponRedemptions),
}));

export const couponCoursesRelations = relations(couponCourses, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponCourses.couponId],
    references: [coupons.id],
  }),
  course: one(courses, {
    fields: [couponCourses.courseId],
    references: [courses.id],
  }),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  student: one(user, {
    fields: [couponRedemptions.studentId],
    references: [user.id],
  }),
  payment: one(payments, {
    fields: [couponRedemptions.paymentId],
    references: [payments.id],
  }),
}));
