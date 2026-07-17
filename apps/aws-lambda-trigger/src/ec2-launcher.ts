import { EC2Client, RunInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import type { VideoQuality } from "./types";

export const QUALITY_WEIGHTS: Record<number, number> = {
  144: 0.2,
  240: 0.3,
  360: 0.5,
  480: 0.7,
  540: 0.8,
  720: 1.0,
  900: 1.2,
  1080: 1.5,
  1440: 2.5,
  2160: 5.0,
  4320: 10.0,
};

/**
 * Calculate required instance count based on video duration and requested qualities.
 */
export function calcInstanceCount(durationSeconds: number, qualities: VideoQuality[]): number {
  const sumWeights = qualities.reduce((sum, q) => sum + (QUALITY_WEIGHTS[q] || 1.0), 0);
  const weightFactor = qualities.length > 0 ? sumWeights : 1.5;
  const virtualDuration = durationSeconds * weightFactor;

  const count = Math.ceil(virtualDuration / 3600);
  return Math.min(8, Math.max(1, count));
}

/**
 * Get count of currently running or pending video-encoder EC2 instances.
 */
export async function getRunningWorkerCount(ec2: EC2Client): Promise<number> {
  try {
    const result = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          { Name: "tag:Role", Values: ["video-encoder"] },
          { Name: "instance-state-name", Values: ["running", "pending"] },
        ],
      })
    );
    let count = 0;
    if (result.Reservations) {
      for (const res of result.Reservations) {
        if (res.Instances) {
          count += res.Instances.length;
        }
      }
    }
    return count;
  } catch (err) {
    console.error("[ec2] Failed to describe instances:", err);
    return 0;
  }
}

/**
 * Build the user data shell script for EC2 bootstrapping.
 */
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
aws s3 cp s3://${process.env.WORKER_ASSETS_BUCKET}/cookies.txt /app/cookies.txt || true

# ── Install Node deps (already bundled in tar, but run just in case) ─────────
cd /app
npm install --production 2>/dev/null || true

# ── Start the worker process ─────────────────────────────────────────────────
node dist/index.js >> /var/log/video-worker.log 2>&1`;

  return Buffer.from(script).toString("base64");
}

/**
 * Launch worker instances.
 */
export async function launchWorkerInstances(
  ec2: EC2Client,
  count: number,
  videoId: string,
  chunkDurationSeconds: number
): Promise<string[]> {
  if (count <= 0) return [];

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
    INSTANCE_COUNT: String(count),
  });

  const keyName = process.env.KEY_PAIR_NAME;
  const securityGroupId = process.env.SECURITY_GROUP_ID;

  const runResult = await ec2.send(
    new RunInstancesCommand({
      ImageId: process.env.AMI_ID!,
      InstanceType: "c5.2xlarge",
      MinCount: count,
      MaxCount: count,
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

  return runResult.Instances?.map((i) => i.InstanceId!) ?? [];
}
