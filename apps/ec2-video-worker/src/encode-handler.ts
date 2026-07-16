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
import { encodeChunkAllQualities, type EncodeResult } from "./ffmpeg";

/**
 * Handle an ENCODE_CHUNK task:
 * 1. Download the raw chunk from S3
 * 2. Encode to all requested qualities → 4-second HLS segments
 * 3. For each quality variant: upload .ts segments + playlist.m3u8 to R2
 * 4. Send CHUNK_ENCODE_COMPLETE callback to Lambda
 *
 * R2 path layout:
 *   videos/<videoId>/chunks/chunk_<N>/h<quality>/
 *     segment_0000.ts
 *     segment_0001.ts
 *     …
 *     playlist.m3u8
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

  const tempDir = await createTempDir();
  const localChunkPath = path.join(tempDir, "chunk.mp4");
  const encodeOutputDir = path.join(tempDir, "encoded");
  await fs.mkdir(encodeOutputDir, { recursive: true });

  try {
    // ── 1. Download chunk from S3 ─────────────────────────────────────────
    const bucket = process.env.S3_BUCKET!;
    console.log(`[encode] chunk ${chunkIndex} | Downloading s3://${bucket}/${chunkS3Key}`);
    await downloadFromS3(bucket, chunkS3Key, localChunkPath, (pct) => {
      if (pct % 20 < 1)
        process.stdout.write(`\r[encode] chunk ${chunkIndex} download ${pct.toFixed(0)}%`);
    });
    process.stdout.write("\n");

    // ── 2. Encode all qualities ───────────────────────────────────────────
    console.log(`[encode] chunk ${chunkIndex} | Encoding ${qualities.join(",")}p`);
    const results = await encodeChunkAllQualities(
      localChunkPath,
      encodeOutputDir,
      qualities,
      hlsSegmentDuration,
      2 // concurrency: 2 simultaneous ffmpeg on c5.2xlarge
    );

    // ── 3. Upload to R2 ───────────────────────────────────────────────────
    for (const result of results) {
      await uploadVariantToR2(result, r2BasePath);
    }

    console.log(JSON.stringify({ step: "ENCODE_DONE", videoId, chunkIndex, qualities }));

    // ── 4. Callback ───────────────────────────────────────────────────────
    await sendCallback({
      event: "CHUNK_ENCODE_COMPLETE",
      videoId,
      chunkIndex,
      totalChunks,
      qualities,
    });
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
