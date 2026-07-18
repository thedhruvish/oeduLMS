import type { AppVariables } from "@/types";
import {
  DeleteObjectCommand,
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
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

export function extractS3Key(
  c: Context<AppVariables>,
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("s3://")
  ) {
    return trimmed;
  }
  try {
    if (trimmed.startsWith("s3://")) {
      const parts = trimmed.substring(5).split("/");
      parts.shift(); // remove bucket name
      return parts.join("/");
    }
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname;
    const bucket = getBucketName(c);
    if (pathname.startsWith(`/${bucket}/`)) {
      return pathname.substring(bucket.length + 2);
    }
    return pathname.substring(1);
  } catch {
    return null;
  }
}

export async function deleteS3Directory(c: Context<AppVariables>, prefix: string) {
  if (!prefix) return;
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    const listResponse = await s3.send(listCommand);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const keysToDelete = listResponse.Contents.map((obj) => obj.Key).filter(
        (k): k is string => !!k
      );

      if (keysToDelete.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keysToDelete.map((key) => ({ Key: key })),
            Quiet: true,
          },
        });
        await s3.send(deleteCommand);
        console.log(`Deleted ${keysToDelete.length} objects under S3 prefix: ${prefix}`);
      }
    }
  } catch (err) {
    console.error(`Failed to delete S3 objects under prefix ${prefix}:`, err);
  }
}

export async function deleteVideoAssets(
  c: Context<AppVariables>,
  videoUrl: string | null | undefined,
  hlsUrl: string | null | undefined,
  videoId?: string
) {
  // 1. Delete raw video if it exists
  const rawKey = extractS3Key(c, videoUrl);
  if (rawKey) {
    console.log(`Deleting S3 raw video: ${rawKey}`);
    await deleteS3Object(c, rawKey);
  }

  // 2. Delete HLS video folder if it exists
  let folderPrefix: string | null = null;
  const hlsKey = extractS3Key(c, hlsUrl);
  if (hlsKey) {
    const lastSlashIdx = hlsKey.lastIndexOf("/");
    if (lastSlashIdx !== -1) {
      folderPrefix = hlsKey.substring(0, lastSlashIdx + 1);
    }
  } else if (videoId) {
    folderPrefix = `videos/${videoId}/`;
  }

  if (folderPrefix) {
    console.log(`Deleting S3 HLS folder prefix: ${folderPrefix}`);
    await deleteS3Directory(c, folderPrefix);
  }
}
