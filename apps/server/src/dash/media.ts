import { Hono } from "hono";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";
import { getBucketName, getPublicFileUrl, getS3Client } from "@/utils/s3-client";

export const dashMediaRouter = new Hono<AppVariables>();

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  directory: z.string().optional().default("general"),
});

// 1. POST /presign-upload — Generate S3 upload presigned URL for students/general users
dashMediaRouter.post("/presign-upload", zValidator("json", presignSchema), async (c) => {
  const { filename, contentType, directory } = c.req.valid("json");
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);

  const uuid = crypto.randomUUID();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${directory}/${uuid}-${safeName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const fileUrl = getPublicFileUrl(c, key);

    return c.json({
      uploadUrl,
      fileUrl,
      key,
    });
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
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);
    return c.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "S3 Delete failed";
    return c.json({ error: msg }, 500);
  }
});
