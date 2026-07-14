import { z } from "zod";

export const commentSchema = z.object({
  comment: z
    .string()
    .min(1, "Comment content is required")
    .max(1000, "Comment cannot exceed 1000 characters"),
  parentId: z.uuid("Invalid parent comment ID").optional().nullable(),
});

export type CommentInput = z.infer<typeof commentSchema>;

export const postSchema = z.object({
  content: z
    .string()
    .min(1, "Post content is required")
    .max(5000, "Post cannot exceed 5000 characters"),
  image: z.url("Invalid image URL").optional().nullable(),
  video: z.url("Invalid video URL").optional().nullable(),
});

export type PostInput = z.infer<typeof postSchema>;
