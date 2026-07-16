import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createWriteStream, createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────
// S3 client (source / staging bucket)
// ─────────────────────────────────────────────────────────────────────────────

export const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: process.env.S3_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      }
    : undefined, // uses IAM role on EC2
});

// ─────────────────────────────────────────────────────────────────────────────
// R2 client (Cloudflare, S3-compatible)
// ─────────────────────────────────────────────────────────────────────────────

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Temp dir helpers
// ─────────────────────────────────────────────────────────────────────────────

export const createTempDir = async (): Promise<string> => {
  const dir = path.join(tmpdir(), `vp-${uuidv4()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const cleanupDir = async (dir: string): Promise<void> => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// S3 download with progress
// ─────────────────────────────────────────────────────────────────────────────

export const downloadFromS3 = async (
  bucket: string,
  key: string,
  localPath: string,
  onProgress?: (pct: number) => void
): Promise<string> => {
  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const totalBytes = Number(resp.ContentLength ?? 0);
  let downloaded = 0;

  return new Promise((resolve, reject) => {
    const ws = createWriteStream(localPath);
    (resp.Body as NodeJS.ReadableStream)
      .on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        if (onProgress && totalBytes) onProgress((downloaded / totalBytes) * 100);
      })
      .pipe(ws)
      .on("finish", () => resolve(localPath))
      .on("error", reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// S3 upload
// ─────────────────────────────────────────────────────────────────────────────

export const uploadToS3 = async (
  localPath: string,
  bucket: string,
  key: string,
  contentType = "video/mp4"
): Promise<void> => {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: createReadStream(localPath),
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 16, // 16 MB parts
  });
  await upload.done();
};

// ─────────────────────────────────────────────────────────────────────────────
// R2 upload (single or multipart via aws-sdk Upload)
// ─────────────────────────────────────────────────────────────────────────────

export const uploadToR2 = async (
  localPath: string,
  r2Key: string,
  contentType = "video/mp2t"
): Promise<void> => {
  const upload = new Upload({
    client: r2,
    params: {
      Bucket: process.env.R2_BUCKET!,
      Key: r2Key,
      Body: createReadStream(localPath),
      ContentType: contentType,
    },
    queueSize: 6,
    partSize: 1024 * 1024 * 16,
  });
  await upload.done();
};

export const uploadStringToR2 = async (
  content: string,
  r2Key: string,
  contentType = "application/vnd.apple.mpegurl"
): Promise<void> => {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: r2Key,
      Body: content,
      ContentType: contentType,
    })
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Callback helper — POST event to Lambda callback URL
// ─────────────────────────────────────────────────────────────────────────────

export const sendCallback = async (payload: object): Promise<void> => {
  const callbackUrl = process.env.LAMBDA_CALLBACK_URL;
  if (!callbackUrl) return;

  try {
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: payload }),
    });
  } catch (err) {
    console.error("[callback] Failed to send:", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Parse s3://bucket/key URL
// ─────────────────────────────────────────────────────────────────────────────

export const parseS3Url = (url: string): { bucket: string; key: string } => {
  const match = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid S3 URL: ${url}`);
  return { bucket: match[1], key: match[2] };
};
