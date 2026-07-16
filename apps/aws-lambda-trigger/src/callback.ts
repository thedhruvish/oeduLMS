import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Context } from "aws-lambda";
import type { EC2Event, CFEvent, VideoQuality } from "./types";
import { createPipelineSql, initVideoState, incrementChunk, setStatus, ensureTable } from "./pipeline-db";

/**
 * Lambda: Callback handler
 *
 * Every EC2 event arrives here first.
 *
 * CHUNK_ENCODE_COMPLETE → handled entirely here (pipeline DB counter)
 *                       → when all chunks done: build master playlist → forward MASTER_PLAYLIST_READY to CF Worker
 *
 * SPLIT_COMPLETE        → init pipeline DB row → forward to CF Worker
 * ERROR                 → write to pipeline DB → forward to CF Worker
 *
 * CF Worker only ever sees: SPLIT_COMPLETE | MASTER_PLAYLIST_READY | ERROR
 *
 */
export const callbackHandler = async (
  event: { body: string },
  _ctx: Context
): Promise<{ statusCode: number; body: string }> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bodyObj: any;
  try {
    bodyObj = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad JSON" }) };
  }
  const ec2Event = (bodyObj.event && typeof bodyObj.event === "object"
    ? bodyObj.event
    : bodyObj) as EC2Event;

  const sql = createPipelineSql();
  await ensureTable(sql);

  switch (ec2Event.event) {
    // ── SPLIT complete — init DB row, forward to CF Worker ────────────────
    case "SPLIT_COMPLETE": {
      const { videoId, durationSeconds, totalChunks, qualities } = ec2Event;

      await initVideoState(sql, videoId, durationSeconds, totalChunks, qualities);

      const cfEvent: CFEvent = {
        event: "SPLIT_COMPLETE",
        videoId,
        durationSeconds,
        totalChunks,
      };
      await forwardToCFWorker(cfEvent);

      console.log(JSON.stringify({ lambda: "SPLIT_COMPLETE", videoId, totalChunks }));
      break;
    }

    // ── Chunk done — count internally, CF Worker not involved ─────────────
    case "CHUNK_ENCODE_COMPLETE": {
      const { videoId, chunkIndex, qualities } = ec2Event;

      const result = await incrementChunk(sql, videoId);

      if (!result) {
        // Row missing — SPLIT_COMPLETE hasn't arrived yet (rare race).
        // Log and skip: SQS will retry or the chunk will be reported again.
        console.warn(JSON.stringify({ lambda: "CHUNK_MISSING_ROW", videoId, chunkIndex }));
        break;
      }

      const { completedChunks } = result;

      console.log(
        JSON.stringify({
          lambda: "CHUNK_ENCODE_COMPLETE",
          videoId,
          chunkIndex,
          completedChunks,
          totalChunks: result.totalChunks,
        })
      );

      // All chunks done → build master playlist, then forward to CF Worker
      if (completedChunks >= result.totalChunks) {
        const masterKey = await buildMasterPlaylist(videoId, qualities, result.totalChunks);

        await setStatus(sql, videoId, "READY", { masterUrl: buildPublicUrl(masterKey) });

        const cfEvent: CFEvent = {
          event: "MASTER_PLAYLIST_READY",
          videoId,
          masterPlaylistR2Key: masterKey,
        };
        await forwardToCFWorker(cfEvent);

        console.log(JSON.stringify({ lambda: "MASTER_PLAYLIST_READY", videoId, masterKey }));
      }
      break;
    }

    // ── Error — write to DB, forward to CF Worker ─────────────────────────
    case "ERROR": {
      const { videoId, message } = ec2Event;

      await setStatus(sql, videoId, "ERROR", { errorMessage: message });

      const cfEvent: CFEvent = {
        event: "ERROR",
        videoId,
        message,
      };
      await forwardToCFWorker(cfEvent);

      console.error(JSON.stringify({ lambda: "ERROR", videoId, message }));
      break;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Forward event to CF Worker (only SPLIT_COMPLETE / MASTER_PLAYLIST_READY / ERROR)
// ─────────────────────────────────────────────────────────────────────────────

async function forwardToCFWorker(ev: CFEvent): Promise<void> {
  const url = process.env.CF_WORKER_CALLBACK_URL;
  if (!url) {
    console.warn("[forward] CF_WORKER_CALLBACK_URL not set");
    return;
  }
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pipeline-Secret": process.env.PIPELINE_SECRET ?? "",
      },
      body: JSON.stringify(ev),
    });
    if (!resp.ok) {
      console.error(`[forward] CF Worker ${resp.status}: ${await resp.text()}`);
    }
  } catch (err) {
    console.error("[forward] fetch failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build master HLS playlist and upload to R2
// ─────────────────────────────────────────────────────────────────────────────

const BANDWIDTH_MAP: Record<number, number> = {
  144: 150_000,
  240: 400_000,
  360: 800_000,
  480: 1_400_000,
  540: 2_000_000,
  720: 3_000_000,
  900: 4_500_000,
  1080: 6_000_000,
  1440: 10_000_000,
  2160: 20_000_000,
  4320: 50_000_000,
};

const RESOLUTION_MAP: Record<number, string> = {
  144: "256x144",
  240: "426x240",
  360: "640x360",
  480: "854x480",
  540: "960x540",
  720: "1280x720",
  900: "1600x900",
  1080: "1920x1080",
  1440: "2560x1440",
  2160: "3840x2160",
  4320: "7680x4320",
};

async function buildMasterPlaylist(
  videoId: string,
  qualities: VideoQuality[],
  totalChunks: number
): Promise<string> {
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  // Per-quality stitched playlist (concatenates all chunks)
  for (const q of qualities) {
    const lines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-PLAYLIST-TYPE:VOD"];
    for (let i = 0; i < totalChunks; i++) {
      // Reference each chunk's variant playlist
      lines.push(`../chunks/chunk_${String(i).padStart(3, "0")}/h${q}/playlist.m3u8`);
    }
    lines.push("#EXT-X-ENDLIST");

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: `videos/${videoId}/h${q}/playlist.m3u8`,
        Body: lines.join("\n"),
        ContentType: "application/vnd.apple.mpegurl",
      })
    );
  }

  // Master playlist
  const masterLines = ["#EXTM3U"];
  for (const q of qualities) {
    masterLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${BANDWIDTH_MAP[q]},RESOLUTION=${RESOLUTION_MAP[q]}`
    );
    masterLines.push(`h${q}/playlist.m3u8`);
  }

  const masterKey = `videos/${videoId}/master.m3u8`;
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: masterKey,
      Body: masterLines.join("\n"),
      ContentType: "application/vnd.apple.mpegurl",
    })
  );

  return masterKey;
}

function buildPublicUrl(r2Key: string): string {
  const domain = process.env.R2_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/${r2Key}` : r2Key;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spot interruption handler (EventBridge → EC2 warning)
// ─────────────────────────────────────────────────────────────────────────────

export const spotInterruptionHandler = async (event: {
  detail: { "instance-id": string };
}): Promise<void> => {
  const instanceId = event.detail["instance-id"];
  // SQS visibility timeout handles re-queuing automatically.
  // Log and let it be.
  console.warn(JSON.stringify({ lambda: "SPOT_INTERRUPTED", instanceId }));
};
