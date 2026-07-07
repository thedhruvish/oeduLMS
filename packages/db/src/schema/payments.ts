import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { courses } from "./courses";

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // amount in cents
  discount: integer("discount").default(0).notNull(), // discount in cents
  currency: text("currency").default("INR").notNull(),
  orderId: text("order_id").notNull(),
  provider: text("provider").notNull(), // stripe, razorpay, paypal, etc.
  providerPaymentId: text("provider_payment_id"),
  status: text("status").notNull(), // pending, completed, failed, refunded, etc.
  metadata: jsonb("metadata"), // extra payment provider data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  student: one(user, {
    fields: [payments.studentId],
    references: [user.id],
  }),
  course: one(courses, {
    fields: [payments.courseId],
    references: [courses.id],
  }),
}));
