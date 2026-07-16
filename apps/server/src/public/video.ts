import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";

/**
 * Video pipeline callback router.
 * Receives events from AWS Lambda and exposes a status polling route for the frontend.
 */
export const videoCallbackRouter = new Hono<AppVariables>();

interface LambdaStatusResponse {
  status: "SPLITTING" | "ENCODING" | "READY" | "ERROR";
  progress: number;
  masterUrl: string | null;
  errorMessage: string | null;
}

// ── Auth Middleware ──────────────────────────────────────────────────────────
// Shared secret check specifically for AWS Lambda callback POST requests

const lambdaAuth = async (c: Context<AppVariables>, next: () => Promise<void>) => {
  const incoming = c.req.header("X-Pipeline-Secret");
  if (!incoming || incoming !== c.env.PIPELINE_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};

// ── Event Schema ──────────────────────────────────────────────────────────────

const eventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("SPLIT_COMPLETE"),
    videoId: z.string(),
    durationSeconds: z.number(),
    totalChunks: z.number(),
  }),
  z.object({
    event: z.literal("MASTER_PLAYLIST_READY"),
    videoId: z.string(),
    masterPlaylistR2Key: z.string(),
  }),
  z.object({
    event: z.literal("ERROR"),
    videoId: z.string(),
    message: z.string(),
  }),
]);

// ── POST /pipeline-callback ───────────────────────────────────────────────────

videoCallbackRouter.post(
  "/pipeline-callback",
  lambdaAuth,
  zValidator("json", eventSchema),
  async (c) => {
    const ev = c.req.valid("json");
    const { createDb } = await import("@oedulms/db");
    const { videos } = await import("@oedulms/db/schema/videos");
    const { courseLectures } = await import("@oedulms/db/schema/courses");
    const { eq } = await import("@oedulms/db/dzl");
    const db = createDb();

    switch (ev.event) {
      case "SPLIT_COMPLETE": {
        // 1. Update transcoding status DB
        await db
          .update(videos)
          .set({
            processingStatus: "ENCODING",
            durationSeconds: Math.round(ev.durationSeconds),
            updatedAt: new Date(),
          })
          .where(eq(videos.id, ev.videoId));

        // 2. Update lecture duration in main database
        await db
          .update(courseLectures)
          .set({
            duration: Math.round(ev.durationSeconds),
            updatedAt: new Date(),
          })
          .where(eq(courseLectures.id, ev.videoId));

        console.log(JSON.stringify({ cf_event: "SPLIT_COMPLETE", videoId: ev.videoId }));
        break;
      }

      case "MASTER_PLAYLIST_READY": {
        const domain = c.env.R2_PUBLIC_DOMAIN ?? "";
        const domainClean = domain.replace(/^https?:\/\//, "");
        const masterUrl = domainClean
          ? `https://${domainClean}/${ev.masterPlaylistR2Key}`
          : ev.masterPlaylistR2Key;

        // 1. Update transcoding status DB
        await db
          .update(videos)
          .set({
            processingStatus: "READY",
            hlsMasterPlaylistUrl: masterUrl,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, ev.videoId));

        // 2. Update HLS play url and publish time in lecture record
        await db
          .update(courseLectures)
          .set({
            hlsUrl: masterUrl,
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(courseLectures.id, ev.videoId));

        console.log(
          JSON.stringify({ cf_event: "MASTER_PLAYLIST_READY", videoId: ev.videoId, masterUrl })
        );
        break;
      }

      case "ERROR": {
        await db
          .update(videos)
          .set({
            processingStatus: "ERROR",
            processingError: ev.message,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, ev.videoId));

        console.error(
          JSON.stringify({ cf_event: "ERROR", videoId: ev.videoId, message: ev.message })
        );
        break;
      }
    }

    return c.json({ ok: true });
  }
);

// ── GET /:videoId/status ─────────────────────────────────────────────────────
// Public unified status checker for frontend video player component/loading spinner.

videoCallbackRouter.get("/:videoId/status", async (c) => {
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

    // 2. If it is SPLITTING or ENCODING, fetch live progress from Lambda status endpoint
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
