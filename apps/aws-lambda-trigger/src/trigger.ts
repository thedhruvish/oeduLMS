import { EC2Client, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  ALL_QUALITIES,
  RECOMMENDED_QUALITIES,
  HIGH_RES_QUALITIES,
  type SplitTask,
  type VideoQuality,
} from "./types";

const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? "us-east-1" });

// ─────────────────────────────────────────────────────────────────────────────
// EC2 spot instance count calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How many EC2 spot instances to run for a given video duration.
 * Rule: 1 instance per started hour of video.
 *   0–1 h  → 1
 *   1–2 h  → 2
 *   2–3 h  → 3
 *   …
 */
function calcInstanceCount(durationSeconds: number): number {
  return Math.ceil(durationSeconds / 3600);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the EC2 UserData bootstrap script
// ─────────────────────────────────────────────────────────────────────────────

function buildUserData(env: Record<string, string>): string {
  const exports = Object.entries(env)
    .map(([k, v]) => `export ${k}="${v}"`)
    .join("\n");

  const script = `#!/bin/bash
set -e

# ── Environment ──────────────────────────────────────────────────────────────
${exports}

# ── Install system dependencies ──────────────────────────────────────────────
apt-get update
apt-get install -y curl unzip ffmpeg

if ! command -v aws &> /dev/null; then
  echo "Installing AWS CLI..."
  apt-get install -y awscli
fi

if ! command -v node &> /dev/null; then
  echo "Installing Node.js 24..."
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

if ! command -v yt-dlp &> /dev/null; then
  echo "Installing yt-dlp..."
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  chmod a+rx /usr/local/bin/yt-dlp
fi

# ── Wait for SSM agent, then pull the worker binary/code from S3 ─────────────
mkdir -p /app
aws s3 cp s3://${process.env.WORKER_ASSETS_BUCKET}/ec2-video-worker.tar.gz /app/worker.tar.gz
tar -xzf /app/worker.tar.gz -C /app

# ── Install Node deps (already bundled in tar, but run just in case) ─────────
cd /app
npm install --production 2>/dev/null || true

# ── Start the worker process ─────────────────────────────────────────────────
node dist/index.js >> /var/log/video-worker.log 2>&1`;

  return Buffer.from(script).toString("base64");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main trigger handler
// ─────────────────────────────────────────────────────────────────────────────

interface TriggerBody {
  /** Opaque video identifier from the LMS DB */
  videoId: string;
  /** Presigned S3 URL or s3://bucket/key of the already-uploaded raw video */
  sourceS3Url: string;
  /**
   * Quality ladder requested.
   * If omitted, defaults to [360, 720, 1080].
   * Allowed values: 144|240|360|480|540|720|900|1080|1440|2160|4320
   */
  qualities?: VideoQuality[];
  /** CF Worker callback URL to receive progress events */
  callbackUrl: string;
  /**
   * Known duration of the video in seconds.
   * Lambda will trust this for instance-count math.
   * If unknown, leave undefined – instance count defaults to 1 and the
   * SPLIT phase will report the real duration back via callbackUrl.
   */
  durationSeconds?: number;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  let body: TriggerBody;

  try {
    body = JSON.parse(event.body ?? "{}") as TriggerBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { videoId, sourceS3Url, callbackUrl, durationSeconds } = body;

  if (!videoId || !sourceS3Url || !callbackUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "videoId, sourceS3Url, and callbackUrl are required" }),
    };
  }

  // Validate & deduplicate qualities
  const rawQualities: VideoQuality[] = body.qualities?.length
    ? (body.qualities.filter((q) => ALL_QUALITIES.includes(q)) as VideoQuality[])
    : RECOMMENDED_QUALITIES;

  if (rawQualities.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "No valid qualities provided" }) };
  }

  // ── Determine chunk duration based on quality set ───────────────────────────
  // If user requests >= 1440p: use 4-min chunks.
  // If recommended only:        use 20-min chunks.
  // Otherwise (custom < 1440p): use 8-min chunks.
  const hasUltraHD = rawQualities.some((q) => HIGH_RES_QUALITIES.includes(q));
  const isRecommendedOnly =
    rawQualities.length === RECOMMENDED_QUALITIES.length &&
    rawQualities.every((q) => RECOMMENDED_QUALITIES.includes(q));

  const chunkDurationMinutes = hasUltraHD ? 4 : isRecommendedOnly ? 20 : 8;
  const chunkDurationSeconds = chunkDurationMinutes * 60;

  // ── Enqueue the SPLIT task ───────────────────────────────────────────────────
  const splitTask: SplitTask = {
    taskType: "SPLIT",
    videoId,
    sourceS3Url,
    qualities: rawQualities,
    durationSeconds,
    callbackUrl,
  };

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL!,
      MessageGroupId: videoId, // FIFO queue – order within a video
      MessageDeduplicationId: `split-${videoId}`,
      MessageBody: JSON.stringify(splitTask),
      MessageAttributes: {
        chunkDurationSeconds: {
          DataType: "Number",
          StringValue: String(chunkDurationSeconds),
        },
      },
    })
  );

  // ── Launch EC2 spot instances ─────────────────────────────────────────────
  const knownDuration = durationSeconds ?? 3600; // default 1 h if unknown
  const instanceCount = calcInstanceCount(knownDuration);

  const userData = buildUserData({
    QUEUE_URL: process.env.QUEUE_URL!,
    S3_REGION: process.env.AWS_REGION ?? "us-east-1",
    S3_BUCKET: process.env.S3_BUCKET!,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_BUCKET: process.env.R2_BUCKET!,
    R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN ?? "",
    LAMBDA_CALLBACK_URL: process.env.LAMBDA_CALLBACK_URL!,
    CHUNK_DURATION_SECONDS: String(chunkDurationSeconds),
  });

  const keyName = process.env.KEY_PAIR_NAME;
  const securityGroupId = process.env.SECURITY_GROUP_ID;

  const runResult = await ec2.send(
    new RunInstancesCommand({
      ImageId: process.env.AMI_ID!,
      InstanceType: "c5.2xlarge", // 8 vCPU, good for ffmpeg parallel encode
      MinCount: instanceCount,
      MaxCount: instanceCount,
      KeyName: keyName || undefined,
      SecurityGroupIds: securityGroupId ? [securityGroupId] : undefined,
      InstanceMarketOptions: {
        MarketType: "spot",
        SpotOptions: {
          SpotInstanceType: "one-time",
          InstanceInterruptionBehavior: "terminate",
        },
      },
      IamInstanceProfile: { Arn: process.env.INSTANCE_PROFILE_ARN! },
      UserData: userData,
      // Persist worker logs to CloudWatch via instance metadata
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            { Key: "Name", Value: `video-worker-${videoId}` },
            { Key: "VideoId", Value: videoId },
            { Key: "Role", Value: "video-encoder" },
          ],
        },
      ],
    })
  );

  const instanceIds = runResult.Instances?.map((i) => i.InstanceId) ?? [];

  console.log(
    JSON.stringify({
      event: "PIPELINE_STARTED",
      videoId,
      instanceCount,
      instanceIds,
      qualities: rawQualities,
      chunkDurationMinutes,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Video pipeline started",
      videoId,
      instanceCount,
      instanceIds,
      qualities: rawQualities,
      chunkDurationMinutes,
    }),
  };
};
