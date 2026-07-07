import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { courseLectures } from "./courses";
import { attachments } from "./attachments";

// 1. Lecture Comments Table
export const lectureComments = pgTable("lecture_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  lectureId: uuid("lecture_id")
    .notNull()
    .references(() => courseLectures.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // self-reference
  content: text("content").notNull(),
  attachmentId: uuid("attachment_id")
    .references(() => attachments.id, { onDelete: "set null" }),
  isEdited: boolean("is_edited").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

// 2. Lecture Comment Reactions Table (Junction Table)
export const lectureCommentReactions = pgTable(
  "lecture_comment_reactions",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => lectureComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull(), // LIKE, HEART, etc.
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId] }),
  ]
);

// 3. Lecture Questions (Q&A) Table
export const lectureQuestions = pgTable("lecture_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  lectureId: uuid("lecture_id")
    .notNull()
    .references(() => courseLectures.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: jsonb("description").notNull(), // Rich Text JSON
  attachmentId: uuid("attachment_id")
    .references(() => attachments.id, { onDelete: "set null" }),
  status: text("status").default("open").notNull(), // open, resolved, etc.
  viewsCount: integer("views_count").default(0).notNull(),
  answersCount: integer("answers_count").default(0).notNull(),
  acceptedAnswerId: uuid("accepted_answer_id"), // Circular reference to lectureQuestionAnswers.id (resolved at app layer or nullable uuid)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

// 4. Lecture Answers Table
export const lectureQuestionAnswers = pgTable("lecture_question_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => lectureQuestions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull(), // Rich Text JSON
  attachmentId: uuid("attachment_id")
    .references(() => attachments.id, { onDelete: "set null" }),
  isInstructorAnswer: boolean("is_instructor_answer").default(false).notNull(),
  isAccepted: boolean("is_accepted").default(false).notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

// 5. Answer Reactions Table (Junction Table)
export const lectureQuestionAnswerReactions = pgTable(
  "lecture_question_answer_reactions",
  {
    answerId: uuid("answer_id")
      .notNull()
      .references(() => lectureQuestionAnswers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.answerId, table.userId] }),
  ]
);

// Relations
export const lectureCommentsRelations = relations(lectureComments, ({ one, many }) => ({
  lecture: one(courseLectures, {
    fields: [lectureComments.lectureId],
    references: [courseLectures.id],
  }),
  user: one(user, {
    fields: [lectureComments.userId],
    references: [user.id],
  }),
  parent: one(lectureComments, {
    fields: [lectureComments.parentId],
    references: [lectureComments.id],
    relationName: "comments_hierarchy",
  }),
  children: many(lectureComments, {
    relationName: "comments_hierarchy",
  }),
  attachment: one(attachments, {
    fields: [lectureComments.attachmentId],
    references: [attachments.id],
  }),
  reactions: many(lectureCommentReactions),
}));

export const lectureCommentReactionsRelations = relations(lectureCommentReactions, ({ one }) => ({
  comment: one(lectureComments, {
    fields: [lectureCommentReactions.commentId],
    references: [lectureComments.id],
  }),
  user: one(user, {
    fields: [lectureCommentReactions.userId],
    references: [user.id],
  }),
}));

export const lectureQuestionsRelations = relations(lectureQuestions, ({ one, many }) => ({
  lecture: one(courseLectures, {
    fields: [lectureQuestions.lectureId],
    references: [courseLectures.id],
  }),
  student: one(user, {
    fields: [lectureQuestions.studentId],
    references: [user.id],
  }),
  attachment: one(attachments, {
    fields: [lectureQuestions.attachmentId],
    references: [attachments.id],
  }),
  answers: many(lectureQuestionAnswers),
  acceptedAnswer: one(lectureQuestionAnswers, {
    fields: [lectureQuestions.acceptedAnswerId],
    references: [lectureQuestionAnswers.id],
  }),
}));

export const lectureQuestionAnswersRelations = relations(lectureQuestionAnswers, ({ one, many }) => ({
  question: one(lectureQuestions, {
    fields: [lectureQuestionAnswers.questionId],
    references: [lectureQuestions.id],
  }),
  user: one(user, {
    fields: [lectureQuestionAnswers.userId],
    references: [user.id],
  }),
  attachment: one(attachments, {
    fields: [lectureQuestionAnswers.attachmentId],
    references: [attachments.id],
  }),
  reactions: many(lectureQuestionAnswerReactions),
}));

export const lectureQuestionAnswerReactionsRelations = relations(lectureQuestionAnswerReactions, ({ one }) => ({
  answer: one(lectureQuestionAnswers, {
    fields: [lectureQuestionAnswerReactions.answerId],
    references: [lectureQuestionAnswers.id],
  }),
  user: one(user, {
    fields: [lectureQuestionAnswerReactions.userId],
    references: [user.id],
  }),
}));
