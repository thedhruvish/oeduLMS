import fs from "fs/promises";
import path from "path";
import { type EncodeChunkTask } from "./types";
import {
  downloadFromS3,
  uploadToR2,
  uploadStringToR2,
  sendCallback,
  createTempDir,
  cleanupDir,
} from "./storage";
import { type EncodeResult } from "./ffmpeg";

/**
 * Handle an ENCODE_CHUNK task:
 * 1. Check if chunk already exists locally (from split phase cache)
 * 2. Download from S3 if missing (throttling log to 20% increments)
 * 3. Encode to qualities concurrently (limit 2) and pipeline variant uploads to R2 in the background
 * 4. Send CHUNK_ENCODE_COMPLETE callback to Lambda
 * 5. Clean up both local raw chunk file and raw chunk file in S3 staging bucket
 */
export const handleEncodeChunkTask = async (task: EncodeChunkTask): Promise<void> => {
  const { videoId, chunkS3Key, chunkIndex, totalChunks, qualities, hlsSegmentDuration } = task;

  const chunkStr = String(chunkIndex).padStart(3, "0");
  const r2BasePath = `videos/${videoId}/chunks/chunk_${chunkStr}`;

  console.log(
    JSON.stringify({
      step: "ENCODE_START",
      videoId,
      chunkIndex,
      totalChunks,
      qualities,
      r2BasePath,
    })
  );

  const localChunksDir = `/tmp/chunks/${videoId}`;
  await fs.mkdir(localChunksDir, { recursive: true });
  const localChunkPath = path.join(localChunksDir, `chunk_${chunkStr}.mp4`);

  const tempDir = await createTempDir();
  const encodeOutputDir = path.join(tempDir, "encoded");
  await fs.mkdir(encodeOutputDir, { recursive: true });

  try {
    // ── 1. Check Local Cache / Download raw chunk ─────────────────────────
    const chunkExists = await fs.access(localChunkPath).then(() => true).catch(() => false);
    const bucket = process.env.S3_BUCKET!;

    if (chunkExists) {
      console.log(`[encode] chunk ${chunkIndex} | Found cached local chunk at ${localChunkPath}`);
    } else {
      console.log(`[encode] chunk ${chunkIndex} | Downloading s3://${bucket}/${chunkS3Key}`);
      let lastLoggedPct = -20;
      await downloadFromS3(bucket, chunkS3Key, localChunkPath, (pct) => {
        const rounded = Math.floor(pct / 20) * 20;
        if (rounded >= lastLoggedPct + 20) {
          console.log(`[encode] chunk ${chunkIndex} | Download progress: ${rounded}%`);
          lastLoggedPct = rounded;
        }
      });
    }

    // ── 2. Encode and Upload in a pipelined fashion ───────────────────────
    console.log(`[encode] chunk ${chunkIndex} | Encoding ${qualities.join(",")}p with pipelined upload`);
    
    const uploadPromises: Promise<void>[] = [];
    const concurrency = 2;
    const activeEncodes: Promise<void>[] = [];

    for (const q of qualities) {
      // If we hit CPU concurrency limit, wait for one of the encodes to finish
      if (activeEncodes.length >= concurrency) {
        await Promise.race(activeEncodes);
      }

      // Start encoding this quality
      const encodePromise = (async () => {
        const { encodeChunkToHLS } = await import("./ffmpeg");
        const result = await encodeChunkToHLS(localChunkPath, encodeOutputDir, q, hlsSegmentDuration);

        // Pipelined background upload as soon as this quality completes encoding
        const uploadPromise = (async () => {
          console.log(`[encode] chunk ${chunkIndex} | Starting background upload of ${q}p`);
          await uploadVariantToR2(result, r2BasePath);
          console.log(`[encode] chunk ${chunkIndex} | Finished background upload of ${q}p`);
        })();
        uploadPromises.push(uploadPromise);
      })();

      activeEncodes.push(encodePromise);

      // Remove completed encode promise from the active list
      encodePromise.then(() => {
        const idx = activeEncodes.indexOf(encodePromise);
        if (idx !== -1) activeEncodes.splice(idx, 1);
      });
    }

    // Wait for all encoding processes to finish
    await Promise.all(activeEncodes);
    console.log(`[encode] chunk ${chunkIndex} | All qualities encoded. Waiting for background uploads to complete...`);

    // Wait for all background uploads to finish
    await Promise.all(uploadPromises);
    console.log(`[encode] chunk ${chunkIndex} | All uploads complete!`);
    console.log(JSON.stringify({ step: "ENCODE_DONE", videoId, chunkIndex, qualities }));

    // ── 3. Callback ───────────────────────────────────────────────────────
    await sendCallback({
      event: "CHUNK_ENCODE_COMPLETE",
      videoId,
      chunkIndex,
      totalChunks,
      qualities,
    });

    // ── 4. Delete local raw chunk file to free up space ───────────────────
    try {
      await fs.rm(localChunkPath, { force: true });
      console.log(`[encode] chunk ${chunkIndex} | Cleaned up local raw chunk at ${localChunkPath}`);
    } catch (err) {
      console.error(`[encode] Failed to delete local raw chunk:`, err);
    }

    // ── 5. Delete raw chunk from S3 to save space ─────────────────────────
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const { s3 } = await import("./storage");
      console.log(`[encode] chunk ${chunkIndex} | Deleting raw chunk s3://${bucket}/${chunkS3Key}`);
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: chunkS3Key }));
    } catch (err) {
      console.error(`[encode] Failed to delete raw chunk s3://${bucket}/${chunkS3Key}:`, err);
    }
  } finally {
    await cleanupDir(tempDir);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload a single quality variant (playlist + segments) to R2
// ─────────────────────────────────────────────────────────────────────────────

async function uploadVariantToR2(result: EncodeResult, r2ChunkBase: string): Promise<void> {
  const variantR2Base = `${r2ChunkBase}/h${result.quality}`;

  // Upload .ts segments
  for (const segPath of result.segmentPaths) {
    const segName = path.basename(segPath);
    const r2Key = `${variantR2Base}/${segName}`;
    await uploadToR2(segPath, r2Key, "video/mp2t");
  }

  // Rewrite playlist.m3u8 to use correct relative R2 paths, then upload
  const rawPlaylist = await fs.readFile(result.variantPlaylistPath, "utf-8");
  const rewrittenPlaylist = rewritePlaylistPaths(rawPlaylist);
  await uploadStringToR2(rewrittenPlaylist, `${variantR2Base}/playlist.m3u8`);

  console.log(`[r2] chunk uploaded: ${variantR2Base}/ (${result.segmentPaths.length} segments)`);
}

/**
 * Rewrite HLS playlist segment URIs.
 * fluent-ffmpeg writes relative paths like "./segment_0000.ts".
 * We strip the leading "./" since R2 URLs are served from the same prefix.
 */
function rewritePlaylistPaths(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (line.startsWith("./")) return line.slice(2);
      return line;
    })
    .join("\n");
}
