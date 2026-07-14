import { z } from "zod";

export const lectureCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment content is required")
    .max(2000, "Comment cannot exceed 2000 characters"),
  parentId: z.uuid("Invalid parent comment ID").optional().nullable(),
});

export type LectureCommentInput = z.infer<typeof lectureCommentSchema>;

export const lectureQuestionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .min(1, "Question description is required")
    .max(5000, "Description cannot exceed 5000 characters"),
});

export type LectureQuestionInput = z.infer<typeof lectureQuestionSchema>;

export const lectureAnswerSchema = z.object({
  content: z
    .string()
    .min(1, "Answer content is required")
    .max(5000, "Answer cannot exceed 5000 characters"),
});

export type LectureAnswerInput = z.infer<typeof lectureAnswerSchema>;

export const lectureProgressSchema = z.object({
  watchSeconds: z.number().int().min(0).optional(),
  lastPosition: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

export type LectureProgressInput = z.infer<typeof lectureProgressSchema>;
