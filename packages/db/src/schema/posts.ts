import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";

// 1. Posts Table
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  image: text("image"),
  video: text("video"),
  isEnableComment: boolean("is_enable_comment").default(true).notNull(),
  visibility: text("visibility").default("public").notNull(), // public, students, private, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Post Comments Table
export const postComments = pgTable("post_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  parentId: uuid("parent_id"), // self-reference for threaded comments
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// 3. Post Likes Table (Junction Table)
export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })]
);

// Relations
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(user, {
    fields: [posts.authorId],
    references: [user.id],
  }),
  comments: many(postComments),
  likes: many(postLikes),
}));

export const postCommentsRelations = relations(postComments, ({ one, many }) => ({
  post: one(posts, {
    fields: [postComments.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [postComments.userId],
    references: [user.id],
  }),
  parent: one(postComments, {
    fields: [postComments.parentId],
    references: [postComments.id],
    relationName: "post_comments_hierarchy",
  }),
  children: many(postComments, {
    relationName: "post_comments_hierarchy",
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [postLikes.userId],
    references: [user.id],
  }),
}));
