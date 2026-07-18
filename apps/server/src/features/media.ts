import type { Context } from "hono";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppVariables } from "../types";
import { getBucketName, getPublicFileUrl, getS3Client } from "../utils/s3-client";

/**
 * Generates an S3 presigned URL for uploading a file to a specific directory.
 */
export async function generatePresignedUpload(
  c: Context<AppVariables>,
  filename: string,
  contentType: string,
  directory = "general"
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);

  const uuid = crypto.randomUUID();
  // Sanitize filename to avoid character issues in S3 keys
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${directory}/${uuid}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const fileUrl = getPublicFileUrl(c, key);

  return {
    uploadUrl,
    fileUrl,
    key,
  };
}

/**
 * Deletes an S3 object by its key.
 */
export async function deleteS3Object(c: Context<AppVariables>, key: string): Promise<void> {
  const s3 = getS3Client(c);
  const bucket = getBucketName(c);

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(command);
}
