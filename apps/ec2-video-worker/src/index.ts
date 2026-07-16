/**
 * EC2 Video Worker — Main entry point
 *
 * Long-polling SQS loop:
 *  - Receives SPLIT or ENCODE_CHUNK messages
 *  - Processes them
 *  - Deletes the message on success (at-least-once delivery)
 *  - On spot interruption: does NOT delete → message re-surfaces after visibility timeout
 *
 * Spot interruption resilience:
 *  - AWS sends a SIGTERM 2 minutes before termination via EC2 metadata
 *  - We poll the metadata endpoint every 5 seconds
 *  - On interrupt: gracefully stop accepting new messages, finish current task if possible
 *  - The Lambda's EventBridge listener also catches the interruption and can re-launch
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { type SQSTask } from "./types";
import { handleSplitTask } from "./split-handler";
import { handleEncodeChunkTask } from "./encode-handler";
import { sendCallback } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_URL = process.env.QUEUE_URL!;
const REGION = process.env.S3_REGION ?? "us-east-1";
const CHUNK_DURATION_SECONDS = parseInt(process.env.CHUNK_DURATION_SECONDS ?? "480", 10);
const STAGING_BUCKET = process.env.S3_BUCKET ?? "oedulms-video-staging-379929762145";
const LOG_FILE = "/var/log/video-worker.log";
const LOG_UPLOAD_INTERVAL_MS = 60 * 1000; // upload every 60 seconds

// SQS visibility timeout must be longer than the longest task
const VISIBILITY_TIMEOUT_SECONDS = 35 * 60; // 35 minutes

const sqs = new SQSClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

// ─────────────────────────────────────────────────────────────────────────────
// EC2 instance identity
// ─────────────────────────────────────────────────────────────────────────────

let instanceId = process.env.INSTANCE_ID ?? "unknown";

async function resolveInstanceId(): Promise<void> {
  try {
    // Try IMDSv2 first (requires a token)
    const tokenResp = await fetch("http://169.254.169.254/latest/api/token", {
      method: "PUT",
      headers: { "X-aws-ec2-metadata-token-ttl-seconds": "60" },
      signal: AbortSignal.timeout(2000),
    });
    const token = tokenResp.ok ? await tokenResp.text() : null;
    const headers: Record<string, string> = token
      ? { "X-aws-ec2-metadata-token": token }
      : {};

    const idResp = await fetch(
      "http://169.254.169.254/latest/meta-data/instance-id",
      { headers, signal: AbortSignal.timeout(2000) }
    );
    if (idResp.ok) {
      instanceId = (await idResp.text()).trim();
      console.log(JSON.stringify({ event: "INSTANCE_ID_RESOLVED", instanceId }));
    }
  } catch {
    // fallback: already set via env var or "unknown"
    console.warn("[s3-log] Could not resolve instance-id from metadata, using:", instanceId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 log uploader
// ─────────────────────────────────────────────────────────────────────────────

async function uploadLogToS3(): Promise<void> {
  if (!existsSync(LOG_FILE)) return;
  try {
    const content = await readFile(LOG_FILE);
    const s3Key = `logs/${instanceId}/worker.log`;
    await s3.send(
      new PutObjectCommand({
        Bucket: STAGING_BUCKET,
        Key: s3Key,
        Body: content,
        ContentType: "text/plain",
        Metadata: {
          instanceId,
          uploadedAt: new Date().toISOString(),
        },
      })
    );
    console.log(JSON.stringify({ event: "LOG_UPLOADED", bucket: STAGING_BUCKET, key: s3Key }));
  } catch (err) {
    console.error("[s3-log] Failed to upload log to S3:", err instanceof Error ? err.message : err);
  }
}

function startLogUploader(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    uploadLogToS3().catch(() => { /* silent – don't crash worker on log failure */ });
  }, LOG_UPLOAD_INTERVAL_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shutdown helper
// ─────────────────────────────────────────────────────────────────────────────

async function shutdownInstance(): Promise<void> {
  console.log(JSON.stringify({ event: "SHUTTING_DOWN_INSTANCE" }));
  // Final log upload before the instance is gone
  await uploadLogToS3();
  try {
    await execAsync("sudo shutdown -h now");
  } catch {
    try {
      await execAsync("shutdown -h now");
    } catch (err) {
      console.error("Failed to shutdown:", err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

let isInterrupted = false;

async function watchForSpotInterruption(): Promise<void> {
  const METADATA_URL = "http://169.254.169.254/latest/meta-data/spot/instance-action";

  const poll = async () => {
    while (!isInterrupted) {
      try {
        const resp = await fetch(METADATA_URL, { signal: AbortSignal.timeout(2000) });
        if (resp.status === 200) {
          const body = (await resp.json()) as { action: string; time: string };
          if (body.action === "terminate") {
            console.warn(JSON.stringify({ event: "SPOT_INTERRUPTION_DETECTED", ...body }));
            isInterrupted = true;
            return;
          }
        }
      } catch {
        // 404 = not interrupted, network error = ignore
      }

      await sleep(5_000);
    }
  };

  poll(); // fire-and-forget
}

// ─────────────────────────────────────────────────────────────────────────────
// Heartbeat: extend SQS visibility while processing
// ─────────────────────────────────────────────────────────────────────────────

function startHeartbeat(receiptHandle: string): ReturnType<typeof setInterval> {
  const EXTEND_EVERY_MS = 10 * 60 * 1000; // every 10 min

  return setInterval(async () => {
    try {
      await sqs.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: receiptHandle,
          VisibilityTimeout: VISIBILITY_TIMEOUT_SECONDS,
        })
      );
      console.log("[heartbeat] Extended SQS visibility timeout");
    } catch (err) {
      console.error("[heartbeat] Failed to extend visibility:", err);
    }
  }, EXTEND_EVERY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SQS polling loop
// ─────────────────────────────────────────────────────────────────────────────

async function pollAndProcess(): Promise<void> {
  console.log(
    JSON.stringify({
      event: "WORKER_START",
      queueUrl: QUEUE_URL,
      chunkDurationSeconds: CHUNK_DURATION_SECONDS,
    })
  );

  await resolveInstanceId();
  const logUploader = startLogUploader();

  await watchForSpotInterruption();

  let idleTimeMs = 0;
  const MAX_IDLE_TIME_MS = 30 * 1000; // 30 seconds

  while (!isInterrupted) {
    let messages;
    const startTime = Date.now();

    try {
      const resp = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1, // process one at a time to maximise focus per task
          WaitTimeSeconds: 20, // long polling
          VisibilityTimeout: VISIBILITY_TIMEOUT_SECONDS,
          MessageAttributeNames: ["All"],
        })
      );
      messages = resp.Messages ?? [];
    } catch (err) {
      console.error("[poll] SQS receive error:", err);
      await sleep(5_000);
      continue;
    }

    if (messages.length === 0) {
      if (isInterrupted) break;
      const elapsed = Date.now() - startTime;
      idleTimeMs += elapsed;
      console.log(`[poll] Queue empty. Idle for ${(idleTimeMs / 1000).toFixed(0)}s`);

      if (idleTimeMs >= MAX_IDLE_TIME_MS) {
        await shutdownInstance();
        break;
      }
      continue;
    }

    // Reset idle time when message is processed
    idleTimeMs = 0;

    for (const message of messages) {
      if (isInterrupted) {
        // Don't process new messages — let visibility expire
        console.log("[poll] Interrupted, skipping new message");
        break;
      }

      const receiptHandle = message.ReceiptHandle!;
      const heartbeat = startHeartbeat(receiptHandle);

      let task: SQSTask;
      try {
        task = JSON.parse(message.Body!) as SQSTask;
      } catch {
        console.error("[poll] Bad message body, deleting:", message.Body);
        await deleteMessage(receiptHandle);
        clearInterval(heartbeat);
        continue;
      }

      console.log(
        JSON.stringify({
          event: "PROCESSING_TASK",
          taskType: task.taskType,
          videoId: task.videoId,
          messageId: message.MessageId,
        })
      );

      try {
        switch (task.taskType) {
          case "SPLIT":
            await handleSplitTask(task, QUEUE_URL, CHUNK_DURATION_SECONDS);
            break;

          case "ENCODE_CHUNK":
            await handleEncodeChunkTask(task);
            break;

          default:
            console.warn("[poll] Unknown task type:", (task as SQSTask).taskType);
        }

        // ── Success: delete the message ──────────────────────────────────
        await deleteMessage(receiptHandle);
        console.log(
          JSON.stringify({
            event: "TASK_COMPLETE",
            taskType: task.taskType,
            videoId: task.videoId,
          })
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(
          JSON.stringify({
            event: "TASK_ERROR",
            taskType: task.taskType,
            videoId: task.videoId,
            error: errMsg,
          })
        );

        // Report error to CF Worker via callback
        await sendCallback({
          event: "ERROR",
          videoId: task.videoId,
          message: errMsg,
          chunkIndex: task.taskType === "ENCODE_CHUNK" ? task.chunkIndex : undefined,
        });

        // Delete the message so it doesn't lock the SQS FIFO Message Group for 35 min.
        // Re-triggers are handled manually or cleanly without queue lockups.
        await deleteMessage(receiptHandle);
      }

      clearInterval(heartbeat);
    }
  }

  console.log(
    JSON.stringify({
      event: "WORKER_SHUTDOWN",
      reason: isInterrupted ? "spot-interrupted" : "queue-empty",
    })
  );
  clearInterval(logUploader);
  await uploadLogToS3();
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function deleteMessage(receiptHandle: string): Promise<void> {
  try {
    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: receiptHandle,
      })
    );
  } catch (err) {
    console.error("[poll] Failed to delete message:", err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

pollAndProcess().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
