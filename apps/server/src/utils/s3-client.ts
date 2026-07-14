import type { AppVariables } from "@/types";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Context } from "hono";

export function getS3Client(c: Context<AppVariables>) {
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

export function getBucketName(c: Context<AppVariables>) {
  return c.env.S3_BUCKET || "oedulms-media";
}

export function getPublicFileUrl(c: Context<AppVariables>, key: string) {
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

export async function deleteS3Object(c: Context<AppVariables>, key: string) {
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3.send(command);
  } catch (err) {
    console.error("Failed to delete S3 attachment object:", err);
  }
}
