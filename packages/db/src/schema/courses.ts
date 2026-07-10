import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  primaryKey,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { instructorProfiles } from "./profiles";

export const publishModeEnum = pgEnum("publish_mode", ["AFTER_TRANSCODE", "SCHEDULED", "DRAFT"]);

// 1. Courses Table
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  instructorId: uuid("instructor_id")
    .notNull()
    .references(() => instructorProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description"),
  description: text("description"),
  thumbnail: text("thumbnail"),
  trailerVideo: text("trailer_video"),
  language: text("language"),
  level: text("level"), // BEGINNER, INTERMEDIATE, ADVANCED, etc.
  validateDays: integer("validate_days"),
  status: text("status").default("DRAFT").notNull(), // DRAFT, PUBLISHED, etc.
  price: integer("price").default(0).notNull(), // price in cents
  discountPrice: integer("discount_price"), // discount price in cents
  currency: text("currency").default("USD").notNull(),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  totalLectures: integer("total_lectures").default(0).notNull(),
  certificateEnabled: boolean("certificate_enabled").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 3. Course Sections Table
export const courseSections = pgTable("course_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull(),
  publishMode: publishModeEnum("publish_mode").default("AFTER_TRANSCODE").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Course Lectures Table
export const courseLectures = pgTable("course_lectures", {
  id: uuid("id").defaultRandom().primaryKey(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => courseSections.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  videoUrl: text("video_url"),
  thumbnail: text("thumbnail"),
  duration: integer("duration").default(0).notNull(), // duration in seconds
  isPreview: boolean("is_preview").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  publishMode: publishModeEnum("publish_mode").default("AFTER_TRANSCODE").notNull(),
  qualities: jsonb("qualities").$type<string[]>().default([]).notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 5. Lecture Resources Table
export const lectureResources = pgTable("lecture_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  lectureId: uuid("lecture_id")
    .notNull()
    .references(() => courseLectures.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // PDF, ZIP, SLIDES, CODE, IMAGE, etc.
  url: text("url").notNull(),
  size: integer("size"), // size in bytes
});

// 6. Course FAQs Table
export const courseFaqs = pgTable("course_faqs", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  position: integer("position").notNull(),
});

// 7. Course Tags Table
export const courseTags = pgTable("course_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

// 8. Course Tag Relations Table (Junction Table)
export const courseTagRelations = pgTable(
  "course_tag_relations",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => courseTags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.tagId] })]
);

// Relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructorProfile: one(instructorProfiles, {
    fields: [courses.instructorId],
    references: [instructorProfiles.id],
  }),
  sections: many(courseSections),
  faqs: many(courseFaqs),
  tagRelations: many(courseTagRelations),
}));

export const courseSectionsRelations = relations(courseSections, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseSections.courseId],
    references: [courses.id],
  }),
  lectures: many(courseLectures),
}));

export const courseLecturesRelations = relations(courseLectures, ({ one, many }) => ({
  section: one(courseSections, {
    fields: [courseLectures.sectionId],
    references: [courseSections.id],
  }),
  resources: many(lectureResources),
}));

export const lectureResourcesRelations = relations(lectureResources, ({ one }) => ({
  lecture: one(courseLectures, {
    fields: [lectureResources.lectureId],
    references: [courseLectures.id],
  }),
}));

export const courseFaqsRelations = relations(courseFaqs, ({ one }) => ({
  course: one(courses, {
    fields: [courseFaqs.courseId],
    references: [courses.id],
  }),
}));

export const courseTagsRelations = relations(courseTags, ({ many }) => ({
  tagRelations: many(courseTagRelations),
}));

export const courseTagRelationsRelations = relations(courseTagRelations, ({ one }) => ({
  course: one(courses, {
    fields: [courseTagRelations.courseId],
    references: [courses.id],
  }),
  tag: one(courseTags, {
    fields: [courseTagRelations.tagId],
    references: [courseTags.id],
  }),
}));
