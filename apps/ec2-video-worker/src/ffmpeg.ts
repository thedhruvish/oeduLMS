import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { type VideoQuality, QUALITY_CONFIG } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// FFprobe helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getVideoDuration = (inputPath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });

export const getVideoInfo = (
  inputPath: string
): Promise<{ duration: number; width: number; height: number; fps: number }> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      resolve({
        duration: metadata.format.duration ?? 0,
        width: videoStream?.width ?? 1920,
        height: videoStream?.height ?? 1080,
        fps: eval(videoStream?.r_frame_rate ?? "30/1") as number, // "30/1" → 30
      });
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Split: cut raw video into equal-duration chunks WITHOUT re-encoding
// ─────────────────────────────────────────────────────────────────────────────

export interface SplitResult {
  chunkPaths: string[];
  durationSeconds: number;
  totalChunks: number;
  chunkDurationSeconds: number;
}

export const splitVideoIntoChunks = async (
  inputPath: string,
  outputDir: string,
  chunkDurationSeconds: number
): Promise<SplitResult> => {
  const duration = await getVideoDuration(inputPath);
  const chunkPattern = path.join(outputDir, "chunk_%03d.mp4");

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c copy", // stream copy — no re-encoding (fast!)
        "-map 0",
        `-segment_time ${chunkDurationSeconds}`,
        "-f segment",
        "-segment_format mp4",
        "-reset_timestamps 1",
        "-avoid_negative_ts make_zero",
        "-break_non_keyframes 0", // cut only on keyframes to avoid corruption
      ])
      .output(chunkPattern)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  const files = await fs.readdir(outputDir);
  const chunkPaths = files
    .filter((f) => f.startsWith("chunk_") && f.endsWith(".mp4"))
    .sort()
    .map((f) => path.join(outputDir, f));

  return {
    chunkPaths,
    durationSeconds: duration,
    totalChunks: chunkPaths.length,
    chunkDurationSeconds,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Encode: transcode one chunk to a specific quality → HLS segments
// ─────────────────────────────────────────────────────────────────────────────

export interface EncodeResult {
  quality: VideoQuality;
  variantPlaylistPath: string;
  segmentPaths: string[];
  bandwidth: number;
  resolution: string;
}

export const encodeChunkToHLS = async (
  inputPath: string,
  outputDir: string,
  quality: VideoQuality,
  hlsSegmentDurationSec = 4
): Promise<EncodeResult> => {
  const cfg = QUALITY_CONFIG[quality];
  const variantDir = path.join(outputDir, `h${quality}`);
  await fs.mkdir(variantDir, { recursive: true });

  const playlistPath = path.join(variantDir, "playlist.m3u8");
  const segmentPattern = path.join(variantDir, "segment_%04d.ts");

  // Parse resolution
  const [width, height] = cfg.resolution.split("x").map(Number);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        // Video codec
        "-c:v libx264",
        "-preset fast", // fast preset — good balance for spot instances
        "-profile:v main",
        "-level:v 4.1",
        // Scale — force exact resolution with padding to avoid black bars
        `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        // Bitrate
        `-b:v ${cfg.videoBitrate}`,
        `-maxrate ${Math.round(parseInt(cfg.videoBitrate) * 1.5)}k`,
        `-bufsize ${Math.round(parseInt(cfg.videoBitrate) * 2)}k`,
        // Audio
        "-c:a aac",
        `-b:a ${cfg.audioBitrate}`,
        "-ar 48000",
        "-ac 2",
        // HLS output
        "-f hls",
        `-hls_time ${hlsSegmentDurationSec}`,
        "-hls_playlist_type vod",
        `-hls_segment_filename ${segmentPattern}`,
        // Don't embed base URL — we'll handle paths when building the playlist
        "-hls_base_url ./",
      ])
      .output(playlistPath)
      .on("start", (cmd) => console.log(`[ffmpeg] ${quality}p → ${cmd}`))
      .on("progress", (p) =>
        process.stdout.write(`\r[ffmpeg] ${quality}p ${p.percent?.toFixed(1) ?? 0}%`)
      )
      .on("end", () => {
        process.stdout.write("\n");
        resolve();
      })
      .on("error", reject)
      .run();
  });

  // Collect segment paths
  const variantFiles = await fs.readdir(variantDir);
  const segmentPaths = variantFiles
    .filter((f) => f.endsWith(".ts"))
    .sort()
    .map((f) => path.join(variantDir, f));

  return {
    quality,
    variantPlaylistPath: playlistPath,
    segmentPaths,
    bandwidth: cfg.bandwidth,
    resolution: cfg.resolution,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Encode all qualities for a single chunk (parallelised up to concurrency)
// ─────────────────────────────────────────────────────────────────────────────

export const encodeChunkAllQualities = async (
  inputPath: string,
  outputDir: string,
  qualities: VideoQuality[],
  hlsSegmentDurationSec = 4,
  concurrency = 2 // 2 simultaneous ffmpeg processes on c5.2xlarge (8 vCPU)
): Promise<EncodeResult[]> => {
  const results: EncodeResult[] = [];

  // Run in batches of `concurrency`
  for (let i = 0; i < qualities.length; i += concurrency) {
    const batch = qualities.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((q) => encodeChunkToHLS(inputPath, outputDir, q, hlsSegmentDurationSec))
    );
    results.push(...batchResults);
  }

  return results;
};
