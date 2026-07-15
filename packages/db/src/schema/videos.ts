import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Videos Table
 * Stores metadata and processing states for video uploads.
 */
export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  originalName: text("original_name"),
  fileSize: integer("file_size"), // in bytes
  processingStatus: text("processing_status").default("IDLE").notNull(), // IDLE, SPLITTING, ENCODING, READY, ERROR
  durationSeconds: integer("duration_seconds"),
  hlsMasterPlaylistUrl: text("hls_master_playlist_url"),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
