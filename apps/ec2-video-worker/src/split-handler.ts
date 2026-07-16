import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { type SplitTask } from "./types";
import {
  downloadFromS3,
  uploadToS3,
  sendCallback,
  parseS3Url,
  createTempDir,
  cleanupDir,
} from "./storage";
import { splitVideoIntoChunks } from "./ffmpeg";

import fsSync from "fs";

const execAsync = promisify(exec);

async function downloadFromYouTube(url: string, localPath: string): Promise<void> {
  console.log(`[split] Downloading YouTube video using yt-dlp: ${url}`);
  let cmd = `yt-dlp --extractor-args "youtube:player-client=ios" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 --no-playlist`;
  
  if (fsSync.existsSync("/app/cookies.txt")) {
    console.log("[split] Using cookies.txt for YouTube authentication");
    cmd += ` --cookies /app/cookies.txt`;
  }
  
  cmd += ` "${url}" -o "${localPath}"`;
  await execAsync(cmd);
}

/**
 * Handle a SPLIT task:
 * 1. Download the raw video from S3
 * 2. Determine duration → compute chunk count
 * 3. Split into equal-duration chunks via stream-copy (fast, no re-encode)
 * 4. Upload each chunk back to S3 (chunks/<videoId>/chunk_000.mp4 …)
 * 5. Enqueue ENCODE_CHUNK tasks on SQS for each chunk
 * 6. Report SPLIT_COMPLETE back to Lambda callback
 */
export const handleSplitTask = async (
  task: SplitTask,
  sqsQueueUrl: string,
  chunkDurationSeconds: number
): Promise<void> => {
  const { videoId, sourceS3Url, qualities, callbackUrl, runId } = task;

  console.log(
    JSON.stringify({
      step: "SPLIT_START",
      videoId,
      sourceS3Url,
      chunkDurationSeconds,
      qualities,
    })
  );

  const tempDir = await createTempDir();
  const localVideoPath = path.join(tempDir, "source.mp4");

  try {
    // ── 1. Download ────────────────────────────────────────────────────────
    const isYouTube = sourceS3Url.startsWith("http") && (sourceS3Url.includes("youtube.com") || sourceS3Url.includes("youtu.be"));

    if (sourceS3Url.startsWith("s3://")) {
      const { bucket, key } = parseS3Url(sourceS3Url);
      console.log(`[split] Downloading s3://${bucket}/${key}`);
      await downloadFromS3(bucket, key, localVideoPath, (pct) => {
        if (pct % 10 < 0.5) process.stdout.write(`\r[split] Download ${pct.toFixed(0)}%`);
      });
      process.stdout.write("\n");
    } else if (isYouTube) {
      await downloadFromYouTube(sourceS3Url, localVideoPath);
    } else if (sourceS3Url.startsWith("http://") || sourceS3Url.startsWith("https://")) {
      console.log(`[split] Downloading HTTP URL: ${sourceS3Url}`);
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      await execAsync(`curl -L -f -sS -o "${localVideoPath}" "${sourceS3Url}"`);
    } else {
      throw new Error(`Unsupported source URL protocol: ${sourceS3Url}`);
    }

    // ── 2. Split ───────────────────────────────────────────────────────────
    const chunksDir = path.join(tempDir, "chunks");
    await fs.mkdir(chunksDir, { recursive: true });

    const splitResult = await splitVideoIntoChunks(localVideoPath, chunksDir, chunkDurationSeconds);

    console.log(
      JSON.stringify({
        step: "SPLIT_DONE",
        videoId,
        totalChunks: splitResult.totalChunks,
        durationSeconds: splitResult.durationSeconds,
      })
    );

    // ── 3. Upload chunks to S3 ─────────────────────────────────────────────
    const s3Bucket = process.env.S3_BUCKET!;
    const chunkS3Keys: string[] = [];

    for (let i = 0; i < splitResult.chunkPaths.length; i++) {
      const chunkPath = splitResult.chunkPaths[i];
      const chunkKey = `chunks/${videoId}/chunk_${String(i).padStart(3, "0")}.mp4`;
      console.log(
        `[split] Uploading chunk ${i + 1}/${splitResult.totalChunks} → s3://${s3Bucket}/${chunkKey}`
      );
      await uploadToS3(chunkPath, s3Bucket, chunkKey);
      chunkS3Keys.push(chunkKey);
    }

    // ── 4. Enqueue ENCODE_CHUNK tasks on SQS ──────────────────────────────
    const { SQSClient, SendMessageCommand } = await import("@aws-sdk/client-sqs");
    const sqs = new SQSClient({ region: process.env.S3_REGION ?? "us-east-1" });

    for (let i = 0; i < chunkS3Keys.length; i++) {
      const encodeTask = {
        taskType: "ENCODE_CHUNK",
        videoId,
        chunkS3Key: chunkS3Keys[i],
        chunkIndex: i,
        totalChunks: splitResult.totalChunks,
        qualities,
        hlsSegmentDuration: 4, // 4-second HLS segments as specified
        callbackUrl,
        runId,
      };

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: sqsQueueUrl,
          MessageGroupId: videoId,
          MessageDeduplicationId: `encode-${videoId}-chunk-${i}-${runId || "legacy"}`,
          MessageBody: JSON.stringify(encodeTask),
        })
      );
    }

    console.log(`[split] Enqueued ${chunkS3Keys.length} ENCODE_CHUNK tasks`);

    // ── 5. Callback: SPLIT_COMPLETE ────────────────────────────────────────
    await sendCallback({
      event: "SPLIT_COMPLETE",
      videoId,
      durationSeconds: splitResult.durationSeconds,
      totalChunks: splitResult.totalChunks,
      chunkDurationSec: chunkDurationSeconds,
    });
  } finally {
    await cleanupDir(tempDir);
  }
};
