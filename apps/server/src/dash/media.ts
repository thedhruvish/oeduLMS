import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";
import { generatePresignedUpload, deleteS3Object } from "../features/media";

export const dashMediaRouter = new Hono<AppVariables>();

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  directory: z.string().optional().default("general"),
});

// 1. POST /presign-upload — Generate S3 upload presigned URL for students/general users
dashMediaRouter.post("/presign-upload", zValidator("json", presignSchema), async (c) => {
  const { filename, contentType, directory } = c.req.valid("json");
  try {
    const res = await generatePresignedUpload(c, filename, contentType, directory);
    return c.json(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "S3 Presign generation failed";
    return c.json({ error: msg }, 500);
  }
});

const deleteSchema = z.object({
  key: z.string().min(1),
});

// 2. DELETE / — Delete S3 object by key
dashMediaRouter.delete("/", zValidator("json", deleteSchema), async (c) => {
  const { key } = c.req.valid("json");
  try {
    await deleteS3Object(c, key);
    return c.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "S3 Delete failed";
    return c.json({ error: msg }, 500);
  }
});
