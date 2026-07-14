import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

// 1. User Roles Table
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"STUDENT" | "TEACHER">().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_roles_user_id_role_idx").on(table.userId, table.role)]
);

// 2. Student Profile Table
export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  bio: text("bio"),
  headline: text("headline"),
  phone: text("phone"),
  country: text("country"),
  socialMedia: jsonb("social_media"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 3. Instructor Profile Table
export const instructorProfiles = pgTable("instructor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  headline: text("headline"),
  bio: text("bio"),
  avatar: text("avatar"),
  coverImage: text("cover_image"),
  socialMedia: jsonb("social_media"), // Array of social media objects
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(user, {
    fields: [userRoles.userId],
    references: [user.id],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(user, {
    fields: [studentProfiles.userId],
    references: [user.id],
  }),
}));

export const instructorProfilesRelations = relations(instructorProfiles, ({ one }) => ({
  user: one(user, {
    fields: [instructorProfiles.userId],
    references: [user.id],
  }),
}));

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
