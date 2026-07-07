import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const organizations = pgTable("organization", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  coverImage: text("cover_image"),
  email: text("email"),
  phone: text("phone"),
  socialMediaLink: jsonb("social_media_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
