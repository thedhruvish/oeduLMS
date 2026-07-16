/**
 * Shared types (copy of apps/aws-lambda-trigger/src/types.ts)
 * Keep in sync or extract to a shared package.
 */

export type VideoQuality = 144 | 240 | 360 | 480 | 540 | 720 | 900 | 1080 | 1440 | 2160 | 4320;

export const ALL_QUALITIES: VideoQuality[] = [
  144, 240, 360, 480, 540, 720, 900, 1080, 1440, 2160, 4320,
];

export const HIGH_RES_QUALITIES: VideoQuality[] = [1440, 2160, 4320];

export type TaskType = "SPLIT" | "ENCODE_CHUNK";

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

// Quality → encoding configuration
export interface QualityConfig {
  videoBitrate: string;
  audioBitrate: string;
  bandwidth: number;
  resolution: string;
}

export const QUALITY_CONFIG: Record<VideoQuality, QualityConfig> = {
  144: { videoBitrate: "100k", audioBitrate: "32k", bandwidth: 150_000, resolution: "256x144" },
  240: { videoBitrate: "300k", audioBitrate: "64k", bandwidth: 400_000, resolution: "426x240" },
  360: { videoBitrate: "600k", audioBitrate: "96k", bandwidth: 800_000, resolution: "640x360" },
  480: { videoBitrate: "1000k", audioBitrate: "128k", bandwidth: 1_400_000, resolution: "854x480" },
  540: { videoBitrate: "1500k", audioBitrate: "128k", bandwidth: 2_000_000, resolution: "960x540" },
  720: {
    videoBitrate: "2500k",
    audioBitrate: "128k",
    bandwidth: 3_000_000,
    resolution: "1280x720",
  },
  900: {
    videoBitrate: "3500k",
    audioBitrate: "192k",
    bandwidth: 4_500_000,
    resolution: "1600x900",
  },
  1080: {
    videoBitrate: "5000k",
    audioBitrate: "192k",
    bandwidth: 6_000_000,
    resolution: "1920x1080",
  },
  1440: {
    videoBitrate: "8000k",
    audioBitrate: "256k",
    bandwidth: 10_000_000,
    resolution: "2560x1440",
  },
  2160: {
    videoBitrate: "16000k",
    audioBitrate: "320k",
    bandwidth: 20_000_000,
    resolution: "3840x2160",
  },
  4320: {
    videoBitrate: "40000k",
    audioBitrate: "448k",
    bandwidth: 50_000_000,
    resolution: "7680x4320",
  },
};
