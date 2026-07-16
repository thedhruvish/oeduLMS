import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const siteTheme = pgTable("site_theme", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lightTheme: jsonb("light_theme").$type<Record<string, string>>().notNull(),
  darkTheme: jsonb("dark_theme").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
