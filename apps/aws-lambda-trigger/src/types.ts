/**
 * Shared types across all Lambda handlers
 */

export type VideoQuality = 144 | 240 | 360 | 480 | 540 | 720 | 900 | 1080 | 1440 | 2160 | 4320;

export const ALL_QUALITIES: VideoQuality[] = [
  144, 240, 360, 480, 540, 720, 900, 1080, 1440, 2160, 4320,
];

export const RECOMMENDED_QUALITIES: VideoQuality[] = [360, 720, 1080];

/** Qualities that require smaller 4-min chunks */
export const HIGH_RES_QUALITIES: VideoQuality[] = [1080,1440, 2160, 4320];

// ── SQS task shapes ───────────────────────────────────────────────────────────

export interface SplitTask {
  taskType: "SPLIT";
  videoId: string;
  sourceS3Url: string;
  qualities: VideoQuality[];
  durationSeconds?: number;
  callbackUrl: string;
  runId?: string;
}

export interface EncodeChunkTask {
  taskType: "ENCODE_CHUNK";
  videoId: string;
  chunkS3Key: string;
  chunkIndex: number;
  totalChunks: number;
  qualities: VideoQuality[];
  hlsSegmentDuration: number;
  callbackUrl: string;
  runId?: string;
}

export type SQSTask = SplitTask | EncodeChunkTask;

// ── EC2 → Lambda callback events (ALL events come here first) ─────────────────

export type EC2Event =
  | {
      event: "SPLIT_STARTED";
      videoId: string;
    }
  | {
      event: "SPLIT_COMPLETE";
      videoId: string;
      durationSeconds: number;
      totalChunks: number;
      qualities: VideoQuality[];
    }
  | {
      event: "CHUNK_ENCODE_COMPLETE";
      videoId: string;
      chunkIndex: number;
      totalChunks: number;
      qualities: VideoQuality[];
    }
  | { event: "ERROR"; videoId: string; message: string; chunkIndex?: number };

// ── Lambda → CF Worker events (only 3 forwarded) ─────────────────────────────

export type CFEvent =
  | { event: "SPLIT_COMPLETE"; videoId: string; durationSeconds: number; totalChunks: number }
  | { event: "MASTER_PLAYLIST_READY"; videoId: string; masterPlaylistR2Key: string }
  | { event: "ERROR"; videoId: string; message: string };

// ── Pipeline state (stored in pipeline Neon DB) ───────────────────────────────

export type ProcessingStatus = "INIT" | "SPLITTING" | "ENCODING" | "READY" | "ERROR";

export interface VideoState {
  videoId: string;
  status: ProcessingStatus;
  durationSeconds: number | null;
  totalChunks: number | null;
  completedChunks: number;
  qualities: VideoQuality[] | null;
  masterUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
