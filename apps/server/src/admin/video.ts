import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";

/**
 * Admin video pipeline endpoints.
 * Handles triggering the transcoding pipeline and querying unified status.
 */
export const adminVideoRouter = new Hono<AppVariables>();

const ALL_QUALITIES = [144, 240, 360, 480, 540, 720, 900, 1080, 1440, 2160, 4320] as const;

interface LambdaStatusResponse {
  status: "SPLITTING" | "ENCODING" | "READY" | "ERROR";
  progress: number;
  masterUrl: string | null;
  errorMessage: string | null;
}

const triggerSchema = z.object({
  videoId: z.string().min(1),
  sourceS3Url: z.string().startsWith("s3://"),
  qualities: z
    .array(z.enum(ALL_QUALITIES.map(String) as [string, ...string[]]))
    .transform((arr) => arr.map(Number))
    .optional(),
  durationSeconds: z.number().positive().optional(),
});

// ── POST /admin/video/trigger-pipeline ────────────────────────────────────────
// Client calls this to trigger AWS Lambda transcoding.

adminVideoRouter.post("/trigger-pipeline", zValidator("json", triggerSchema), async (c) => {
  const { videoId, sourceS3Url, qualities, durationSeconds } = c.req.valid("json");

  const lambdaTriggerUrl = c.env.LAMBDA_TRIGGER_URL;
  const lambdaApiKey = c.env.LAMBDA_API_KEY;

  if (!lambdaTriggerUrl || !lambdaApiKey) {
    return c.json({ error: "Pipeline not configured" }, 500);
  }

  const origin = new URL(c.req.url).origin;
  const callbackUrl = `${origin}/api/public/video/pipeline-callback`;

  try {
    const resp = await fetch(lambdaTriggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": lambdaApiKey,
      },
      body: JSON.stringify({
        videoId,
        sourceS3Url,
        qualities: qualities ?? [360, 720, 1080],
        durationSeconds,
        callbackUrl,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[trigger] Lambda ${resp.status}: ${text}`);
      return c.json({ error: "Pipeline failed to start", details: text }, 502);
    }

    const result = (await resp.json()) as Record<string, unknown>;

    // Update video status to SPLITTING in main DB
    const { createDb } = await import("@oedulms/db");
    const { videos } = await import("@oedulms/db/schema/videos");
    const { eq } = await import("@oedulms/db/dzl");
    await createDb()
      .update(videos)
      .set({ processingStatus: "SPLITTING", updatedAt: new Date() })
      .where(eq(videos.id, videoId));

    return c.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

const retriggerSchema = z.object({
  videoId: z.string().min(1),
});

// ── POST /admin/video/re-trigger ──────────────────────────────────────────────
// Manually re-trigger the transcoding pipeline for an existing video/lecture.
// Resolves the SQS FIFO deduplication issues using a new runId-based identifier.
adminVideoRouter.post("/re-trigger", zValidator("json", retriggerSchema), async (c) => {
  const { videoId } = c.req.valid("json");

  const lambdaTriggerUrl = c.env.LAMBDA_TRIGGER_URL;
  const lambdaApiKey = c.env.LAMBDA_API_KEY;

  if (!lambdaTriggerUrl || !lambdaApiKey) {
    return c.json({ error: "Pipeline not configured" }, 500);
  }

  const origin = new URL(c.req.url).origin;
  const callbackUrl = `${origin}/api/public/video/pipeline-callback`;

  try {
    const { createDb } = await import("@oedulms/db");
    const { courseLectures } = await import("@oedulms/db/schema/courses");
    const { videos } = await import("@oedulms/db/schema/videos");
    const { eq } = await import("@oedulms/db/dzl");
    const db = createDb();

    // Query lecture details to retrieve video url, qualities, and duration
    const lectures = await db
      .select()
      .from(courseLectures)
      .where(eq(courseLectures.id, videoId))
      .limit(1);
    if (!lectures[0]) {
      return c.json({ error: "Lecture not found" }, 404);
    }

    const lecture = lectures[0];
    if (!lecture.videoUrl) {
      return c.json({ error: "No video URL associated with this lecture" }, 400);
    }

    // Clean and parse qualities (removing non-digits like 'p')
    const qualities = lecture.qualities || [];
    const cleanQualities = qualities
      .map((q) => parseInt(String(q).replace(/\D/g, ""), 10))
      .filter((num) => !isNaN(num) && num > 0);
    const numericQualities = cleanQualities.length ? cleanQualities : [360, 720, 1080];

    // Call Lambda trigger endpoint
    const resp = await fetch(lambdaTriggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": lambdaApiKey,
      },
      body: JSON.stringify({
        videoId,
        sourceS3Url: lecture.videoUrl,
        qualities: numericQualities,
        durationSeconds: lecture.duration > 0 ? lecture.duration : undefined,
        callbackUrl,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[re-trigger] Lambda ${resp.status}: ${text}`);
      return c.json({ error: "Pipeline failed to start", details: text }, 502);
    }

    const result = (await resp.json()) as Record<string, unknown>;

    // Update video status to SPLITTING in main DB
    const existing = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    if (existing[0]) {
      await db
        .update(videos)
        .set({
          processingStatus: "SPLITTING",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoId));
    } else {
      await db.insert(videos).values({
        id: videoId,
        processingStatus: "SPLITTING",
      });
    }

    return c.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── GET /admin/video/:videoId/status ─────────────────────────────────────────
// Unified status checker. Returns uploading status or maps live progress from Lambda.

adminVideoRouter.get("/video/:videoId/status", async (c) => {
  const videoId = c.req.param("videoId");

  try {
    // 1. Check main DB status first
    const { createDb } = await import("@oedulms/db");
    const { videos } = await import("@oedulms/db/schema/videos");
    const { eq } = await import("@oedulms/db/dzl");
    const db = createDb();

    const rows = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    const v = rows[0];

    // If still in uploading state, return immediately
    if (v.processingStatus === "UPLOADING" || v.processingStatus === "IDLE") {
      return c.json({
        videoId: v.id,
        status: v.processingStatus,
        progress: 0,
        masterUrl: null,
        errorMessage: null,
      });
    }

    // If already fully processed, return READY
    if (v.processingStatus === "READY") {
      return c.json({
        videoId: v.id,
        status: "READY",
        progress: 100,
        masterUrl: v.hlsMasterPlaylistUrl,
        errorMessage: null,
      });
    }

    // If failed, return ERROR
    if (v.processingStatus === "ERROR") {
      return c.json({
        videoId: v.id,
        status: "ERROR",
        progress: 0,
        masterUrl: null,
        errorMessage: v.processingError,
      });
    }

    // 2. If it's SPLITTING or ENCODING, fetch live progress from Lambda status endpoint
    const lambdaStatusUrl = c.env.LAMBDA_STATUS_URL;
    const lambdaApiKey = c.env.LAMBDA_API_KEY;

    if (!lambdaStatusUrl || !lambdaApiKey) {
      // Fallback if status Lambda is not configured
      return c.json({
        videoId: v.id,
        status: v.processingStatus,
        progress: v.processingStatus === "SPLITTING" ? 15 : 45,
        masterUrl: null,
        errorMessage: null,
      });
    }

    const resp = await fetch(`${lambdaStatusUrl}?videoId=${encodeURIComponent(videoId)}`, {
      headers: { "x-api-key": lambdaApiKey },
    });

    if (resp.ok) {
      const state = (await resp.json()) as LambdaStatusResponse;
      return c.json({
        videoId: v.id,
        status: state.status, // SPLITTING, ENCODING, READY, ERROR
        progress: state.progress, // 0 to 100
        masterUrl: state.masterUrl,
        errorMessage: state.errorMessage,
      });
    }

    // Final fallback
    return c.json({
      videoId: v.id,
      status: v.processingStatus,
      progress: 30,
      masterUrl: null,
      errorMessage: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ── DELETE /admin/video/:videoId ─────────────────────────────────────────────
// Deletes a video record and cleans up associated S3 assets.
adminVideoRouter.delete("/:videoId", async (c) => {
  const videoId = c.req.param("videoId");

  try {
    const { createDb } = await import("@oedulms/db");
    const { courseLectures } = await import("@oedulms/db/schema/courses");
    const { videos } = await import("@oedulms/db/schema/videos");
    const { eq } = await import("@oedulms/db/dzl");
    const db = createDb();

    // 1. Fetch details from both videos table and courseLectures table
    const videoRecord = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    const lectureRecord = await db
      .select()
      .from(courseLectures)
      .where(eq(courseLectures.id, videoId))
      .limit(1);

    const hlsUrl = videoRecord[0]?.hlsMasterPlaylistUrl || lectureRecord[0]?.hlsUrl || null;
    const videoUrl = lectureRecord[0]?.videoUrl || null;

    // 2. Perform S3 deletion of the video assets
    const { deleteVideoAssets } = await import("@/utils/s3-client");
    await deleteVideoAssets(c, videoUrl, hlsUrl, videoId);

    // 3. Clear video URLs in the lecture if it exists
    if (lectureRecord[0]) {
      await db
        .update(courseLectures)
        .set({
          videoUrl: null,
          hlsUrl: null,
          duration: 0,
          qualities: [],
          updatedAt: new Date(),
        })
        .where(eq(courseLectures.id, videoId));
    }

    // 4. Delete from videos table in DB
    await db.delete(videos).where(eq(videos.id, videoId));

    return c.json({ success: true, message: "Video assets deleted successfully" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});
