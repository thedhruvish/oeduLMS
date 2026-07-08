import { Hono, type Context } from "hono";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";

export const adminMediaRouter = new Hono<AppVariables>();

function getS3Client(c: Context<AppVariables>) {
  const accessKeyId = c.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = c.env.S3_SECRET_ACCESS_KEY;
  const region = c.env.S3_REGION || "auto";
  const endpoint = c.env.S3_ENDPOINT;

  return new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId || "placeholder",
      secretAccessKey: secretAccessKey || "placeholder",
    },
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint,
  });
}

function getBucketName(c: Context<AppVariables>) {
  return c.env.S3_BUCKET || "oedulms-media";
}

function getPublicFileUrl(c: Context<AppVariables>, key: string) {
  const publicUrl = c.env.S3_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }
  const endpoint = c.env.S3_ENDPOINT;
  const bucket = getBucketName(c);
  if (endpoint) {
    return `${endpoint}/${bucket}/${key}`;
  }
  const region = c.env.S3_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  directory: z.string().optional().default("general"),
});

// 1. POST /presign-upload — Generate S3 upload presigned URL
adminMediaRouter.post("/presign-upload", zValidator("json", presignSchema), async (c) => {
  const { filename, contentType, directory } = c.req.valid("json");
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);

  const uuid = crypto.randomUUID();
  // Sanitize filename to avoid weird character issues in keys
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
adminMediaRouter.delete("/", zValidator("json", deleteSchema), async (c) => {
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
