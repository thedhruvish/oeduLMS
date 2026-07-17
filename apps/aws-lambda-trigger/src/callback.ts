import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { EC2Client } from "@aws-sdk/client-ec2";
import type { Context } from "aws-lambda";
import {
  type EC2Event,
  type CFEvent,
  type VideoQuality,
  HIGH_RES_QUALITIES,
  RECOMMENDED_QUALITIES,
} from "./types";
import {
  createPipelineSql,
  initVideoState,
  incrementChunk,
  setStatus,
  ensureTable,
} from "./pipeline-db";
import { Readable } from "stream";
import { calcInstanceCount, getRunningWorkerCount, launchWorkerInstances } from "./ec2-launcher";

const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? "us-east-1" });

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
  let bodyObj: unknown;
  try {
    bodyObj = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad JSON" }) };
  }
  const bodyRecord = bodyObj as Record<string, unknown> | null;
  const ec2Event = (bodyRecord && bodyRecord.event && typeof bodyRecord.event === "object"
    ? bodyRecord.event
    : bodyRecord) as unknown as EC2Event;

  const sql = createPipelineSql();
  await ensureTable(sql);

  switch (ec2Event.event) {
    // ── SPLIT started — EC2 worker picked up the task, transition INIT → SPLITTING
    case "SPLIT_STARTED": {
      const { videoId } = ec2Event;
      await sql`
        UPDATE video_pipeline_state
        SET status = 'SPLITTING', updated_at = NOW()
        WHERE video_id = ${videoId} AND status = 'INIT'
      `;
      console.log(JSON.stringify({ lambda: "SPLIT_STARTED", videoId }));
      break;
    }

    // ── SPLIT complete — update DB with real duration/chunks, scale up encoders ──
    case "SPLIT_COMPLETE": {
      const { videoId, durationSeconds, totalChunks, qualities } = ec2Event;

      await initVideoState(sql, videoId, durationSeconds, totalChunks, qualities);

      // ── Failsafe scale-up check ──────────────────────────────────────────────
      // The trigger already pre-booted all required instances upfront (when
      // duration was known). This check only fires additional instances if the
      // trigger didn't have duration info and only booted 1 instance.
      const targetCount = calcInstanceCount(durationSeconds, qualities);
      const runningCount = await getRunningWorkerCount(ec2);

      console.log(
        `[callback] SPLIT_COMPLETE: targetCount=${targetCount}, runningCount=${runningCount}`
      );

      if (runningCount < targetCount) {
        const toLaunch = targetCount - runningCount;

        const hasUltraHD = qualities.some((q) => HIGH_RES_QUALITIES.includes(q));
        const isRecommendedOnly =
          qualities.length === RECOMMENDED_QUALITIES.length &&
          qualities.every((q) => RECOMMENDED_QUALITIES.includes(q));
        const chunkDurationMinutes = hasUltraHD ? 4 : isRecommendedOnly ? 20 : 8;
        const chunkDurationSeconds = chunkDurationMinutes * 60;

        console.log(
          `[callback] Failsafe scale-up: booting ${toLaunch} additional Spot instance(s) (duration was unknown at trigger time).`
        );
        const launched = await launchWorkerInstances(ec2, toLaunch, videoId, chunkDurationSeconds);
        console.log(`[callback] Launched instances: ${JSON.stringify(launched)}`);
      } else {
        console.log(
          `[callback] All ${runningCount} required instance(s) already running (target=${targetCount}). No scale-up needed.`
        );
      }

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

async function readR2File(client: S3Client, bucket: string, key: string): Promise<string> {
  const resp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!resp.Body) return "";
  if (typeof resp.Body.transformToString === "function") {
    return await resp.Body.transformToString();
  }
  const stream = resp.Body as Readable;
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

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

  // Per-quality stitched playlist (concatenates all chunks' actual TS segments)
  for (const q of qualities) {
    const stitchedLines: string[] = [];
    let maxTargetDuration = 4;

    for (let i = 0; i < totalChunks; i++) {
      const chunkDirName = `chunk_${String(i).padStart(3, "0")}`;
      const chunkKey = `videos/${videoId}/chunks/${chunkDirName}/h${q}/playlist.m3u8`;

      try {
        const playlistContent = await readR2File(r2, process.env.R2_BUCKET!, chunkKey);
        const lines = playlistContent.split(/\r?\n/);

        for (let j = 0; j < lines.length; j++) {
          const line = lines[j].trim();
          if (!line) continue;

          if (line.startsWith("#EXT-X-TARGETDURATION:")) {
            const duration = parseInt(line.split(":")[1], 10);
            if (!isNaN(duration) && duration > maxTargetDuration) {
              maxTargetDuration = duration;
            }
          } else if (line.startsWith("#EXTINF:")) {
            stitchedLines.push(line);
            // Read next non-empty line (segment filename)
            let nextLine = "";
            while (j + 1 < lines.length) {
              j++;
              nextLine = lines[j].trim();
              if (nextLine) break;
            }
            if (nextLine && !nextLine.startsWith("#")) {
              stitchedLines.push(`../chunks/${chunkDirName}/h${q}/${nextLine}`);
            } else {
              stitchedLines.push(nextLine);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to read chunk playlist ${chunkKey}:`, err);
      }
    }

    const playlistBody = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      `#EXT-X-TARGETDURATION:${maxTargetDuration}`,
      "#EXT-X-MEDIA-SEQUENCE:0",
      "#EXT-X-PLAYLIST-TYPE:VOD",
      ...stitchedLines,
      "#EXT-X-ENDLIST",
    ].join("\n");

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: `videos/${videoId}/h${q}/playlist.m3u8`,
        Body: playlistBody,
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
  if (!domain) return r2Key;
  const domainClean = domain.replace(/^https?:\/\//, "");
  return `https://${domainClean}/${r2Key}`;
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
