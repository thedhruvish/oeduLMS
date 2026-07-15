import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppVariables } from "../types";

/**
 * Video pipeline callback — receives forwarded events from Lambda.
 *
 * Only 3 events arrive here:
 *   SPLIT_COMPLETE        → update main DB: duration + status = ENCODING
 *   MASTER_PLAYLIST_READY → update main DB: masterUrl + status = READY
 *   ERROR                 → update main DB: status = ERROR
 *
 * CHUNK_ENCODE_COMPLETE is handled entirely inside Lambda (never sent here).
 *
 * Auth: X-Pipeline-Secret header shared secret.
 */
export const videoCallbackRouter = new Hono<AppVariables>();

// ── Auth ──────────────────────────────────────────────────────────────────────

videoCallbackRouter.use("*", async (c, next) => {
  const incoming = c.req.header("X-Pipeline-Secret");
  if (!incoming || incoming !== c.env.PIPELINE_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// ── Schema — only the 3 events CF Worker cares about ─────────────────────────

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

videoCallbackRouter.post("/pipeline-callback", zValidator("json", eventSchema), async (c) => {
  const ev = c.req.valid("json");
  const { createDb } = await import("@oedulms/db");
  const { videos } = await import("@oedulms/db/schema/videos");
  const { eq } = await import("@oedulms/db/dzl");
  const db = createDb();

  switch (ev.event) {
    case "SPLIT_COMPLETE": {
      await db
        .update(videos)
        .set({
          processingStatus: "ENCODING",
          durationSeconds: Math.round(ev.durationSeconds),
          updatedAt: new Date(),
        })
        .where(eq(videos.id, ev.videoId));

      console.log(JSON.stringify({ cf_event: "SPLIT_COMPLETE", videoId: ev.videoId }));
      break;
    }

    case "MASTER_PLAYLIST_READY": {
      const domain = c.env.R2_PUBLIC_DOMAIN ?? "";
      const masterUrl = domain
        ? `https://${domain}/${ev.masterPlaylistR2Key}`
        : ev.masterPlaylistR2Key;

      await db
        .update(videos)
        .set({
          processingStatus: "READY",
          hlsMasterPlaylistUrl: masterUrl,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, ev.videoId));

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
});
