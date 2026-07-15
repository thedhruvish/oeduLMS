import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { VideoState, VideoQuality, ProcessingStatus } from "./types";

/**
 * Raw SQL helpers for the pipeline Neon DB.
 * Lives inside the Lambda package — not shared with the CF Worker.
 *
 * Table: video_pipeline_state
 * One row per video. Tracks chunk-completion counting and status.
 */

export const createPipelineSql = (): NeonQueryFunction<false, false> =>
  neon(process.env.PIPELINE_DATABASE_URL!);

// ── Bootstrap (run once) ──────────────────────────────────────────────────────

export const ensureTable = async (sql: NeonQueryFunction<false, false>): Promise<void> => {
  await sql`
    CREATE TABLE IF NOT EXISTS video_pipeline_state (
      video_id          TEXT        PRIMARY KEY,
      status            TEXT        NOT NULL DEFAULT 'SPLITTING',
      duration_seconds  INTEGER,
      total_chunks      INTEGER,
      completed_chunks  INTEGER     NOT NULL DEFAULT 0,
      qualities         TEXT,
      master_url        TEXT,
      error_message     TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

// ── Writes ────────────────────────────────────────────────────────────────────

/** Upsert row when SPLIT_COMPLETE received */
export const initVideoState = async (
  sql: NeonQueryFunction<false, false>,
  videoId: string,
  durationSeconds: number,
  totalChunks: number,
  qualities: VideoQuality[]
): Promise<void> => {
  await sql`
    INSERT INTO video_pipeline_state
      (video_id, status, duration_seconds, total_chunks, completed_chunks, qualities)
    VALUES
      (${videoId}, 'ENCODING', ${durationSeconds}, ${totalChunks}, 0, ${JSON.stringify(qualities)})
    ON CONFLICT (video_id) DO UPDATE SET
      status           = 'ENCODING',
      duration_seconds = ${durationSeconds},
      total_chunks     = ${totalChunks},
      completed_chunks = 0,
      qualities        = ${JSON.stringify(qualities)},
      updated_at       = NOW()
  `;
};

/**
 * Atomically increment completed_chunks.
 * Single UPDATE…RETURNING — one round-trip, no race condition.
 * Returns the new counts so caller can check if all done.
 */
export const incrementChunk = async (
  sql: NeonQueryFunction<false, false>,
  videoId: string
): Promise<{ completedChunks: number; totalChunks: number } | null> => {
  const rows = await sql`
    UPDATE video_pipeline_state
    SET completed_chunks = completed_chunks + 1,
        updated_at       = NOW()
    WHERE video_id = ${videoId}
    RETURNING completed_chunks, total_chunks
  `;
  if (!rows[0]) return null;
  return {
    completedChunks: rows[0].completed_chunks as number,
    totalChunks: rows[0].total_chunks as number,
  };
};

export const setStatus = async (
  sql: NeonQueryFunction<false, false>,
  videoId: string,
  status: ProcessingStatus,
  extra: { masterUrl?: string; errorMessage?: string } = {}
): Promise<void> => {
  await sql`
    UPDATE video_pipeline_state
    SET status        = ${status},
        master_url    = ${extra.masterUrl ?? null},
        error_message = ${extra.errorMessage ?? null},
        updated_at    = NOW()
    WHERE video_id = ${videoId}
  `;
};

// ── Read ──────────────────────────────────────────────────────────────────────

export const getVideoState = async (
  sql: NeonQueryFunction<false, false>,
  videoId: string
): Promise<VideoState | null> => {
  const rows = await sql`
    SELECT video_id, status, duration_seconds, total_chunks,
           completed_chunks, qualities, master_url, error_message,
           created_at, updated_at
    FROM video_pipeline_state
    WHERE video_id = ${videoId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    videoId: r.video_id as string,
    status: r.status as ProcessingStatus,
    durationSeconds: r.duration_seconds as number | null,
    totalChunks: r.total_chunks as number | null,
    completedChunks: r.completed_chunks as number,
    qualities: r.qualities ? (JSON.parse(r.qualities as string) as VideoQuality[]) : null,
    masterUrl: r.master_url as string | null,
    errorMessage: r.error_message as string | null,
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
};
