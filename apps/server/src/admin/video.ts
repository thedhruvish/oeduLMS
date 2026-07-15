import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";

/**
 * Admin video pipeline endpoints.
 * Uses the main @oedulms/db for course/video records.
 * Delegates pipeline state queries to the Lambda /status endpoint.
 */
export const adminVideoRouter = new Hono<AppVariables>();

const ALL_QUALITIES = [144, 240, 360, 480, 540, 720, 900, 1080, 1440, 2160, 4320] as const;

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

adminVideoRouter.post("/trigger-pipeline", zValidator("json", triggerSchema), async (c) => {
  const { videoId, sourceS3Url, qualities, durationSeconds } = c.req.valid("json");

  const lambdaTriggerUrl = c.env.LAMBDA_TRIGGER_URL;
  const lambdaApiKey = c.env.LAMBDA_API_KEY;

  if (!lambdaTriggerUrl || !lambdaApiKey) {
    return c.json({ error: "Pipeline not configured" }, 500);
  }

  // CF Worker callback URL — Lambda will POST SPLIT_COMPLETE / MASTER_PLAYLIST_READY / ERROR here
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

    // Mark video as SPLITTING in main DB
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

// ── GET /admin/video/:videoId/status ─────────────────────────────────────────
// Calls the Lambda /status endpoint — reads from pipeline Neon DB, not main DB.

adminVideoRouter.get("/video/:videoId/status", async (c) => {
  const videoId = c.req.param("videoId");
  const lambdaStatusUrl = c.env.LAMBDA_STATUS_URL;
  const lambdaApiKey = c.env.LAMBDA_API_KEY;

  if (!lambdaStatusUrl || !lambdaApiKey) {
    return c.json({ error: "Status endpoint not configured" }, 500);
  }

  try {
    const resp = await fetch(`${lambdaStatusUrl}?videoId=${encodeURIComponent(videoId)}`, {
      headers: { "x-api-key": lambdaApiKey },
    });

    if (resp.status === 404) return c.json({ error: "Not found" }, 404);
    if (!resp.ok) return c.json({ error: "Status fetch failed" }, 502);

    const state = await resp.json();
    return c.json(state);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});
