import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { courses, courseLectures } from "./courses";
import { payments } from "./payments";

// 1. Course Enrollments Table
export const courseEnrollments = pgTable("course_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  progress: integer("progress").default(0).notNull(), // 0 to 100 percentage
  status: text("status").default("active").notNull(), // active, completed, refunded, etc.
  completedAt: timestamp("completed_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Lecture Progress Table
export const lectureProgress = pgTable("lecture_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  lectureId: uuid("lecture_id")
    .notNull()
    .references(() => courseLectures.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  watchSeconds: integer("watch_seconds").default(0).notNull(),
  lastPosition: integer("last_position").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 3. Course Reviews Table
export const courseReviews = pgTable("course_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // e.g. 1 to 5
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  student: one(user, {
    fields: [courseEnrollments.studentId],
    references: [user.id],
  }),
  payment: one(payments, {
    fields: [courseEnrollments.paymentId],
    references: [payments.id],
  }),
}));

export const lectureProgressRelations = relations(lectureProgress, ({ one }) => ({
  lecture: one(courseLectures, {
    fields: [lectureProgress.lectureId],
    references: [courseLectures.id],
  }),
  student: one(user, {
    fields: [lectureProgress.studentId],
    references: [user.id],
  }),
}));

export const courseReviewsRelations = relations(courseReviews, ({ one }) => ({
  course: one(courses, {
    fields: [courseReviews.courseId],
    references: [courses.id],
  }),
  student: one(user, {
    fields: [courseReviews.studentId],
    references: [user.id],
  }),
}));
