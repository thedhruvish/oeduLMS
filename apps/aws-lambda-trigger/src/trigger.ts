import { EC2Client } from "@aws-sdk/client-ec2";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  ALL_QUALITIES,
  RECOMMENDED_QUALITIES,
  HIGH_RES_QUALITIES,
  type SplitTask,
  type VideoQuality,
} from "./types";
import { calcInstanceCount, getRunningWorkerCount, launchWorkerInstances } from "./ec2-launcher";
import { createPipelineSql, ensureTable, createVideoState } from "./pipeline-db";

const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? "us-east-1" });

interface TriggerBody {
  /** Opaque video identifier from the LMS DB */
  videoId: string;
  /** Presigned S3 URL or s3://bucket/key of the already-uploaded raw video */
  sourceS3Url: string;
  /**
   * Quality ladder requested.
   * If omitted, defaults to [360, 720, 1080].
   */
  qualities?: VideoQuality[];
  /** CF Worker callback URL to receive progress events */
  callbackUrl: string;
  /**
   * Known duration of the video in seconds.
   * Lambda will trust this for instance-count math.
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

  const { videoId, sourceS3Url, qualities, callbackUrl, durationSeconds } = body;

  if (!videoId || !sourceS3Url || !callbackUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing required fields: videoId, sourceS3Url, callbackUrl",
      }),
    };
  }

  // Normalize requested qualities
  const rawQualities = Array.isArray(qualities)
    ? (qualities.filter((q) => ALL_QUALITIES.includes(q)) as VideoQuality[])
    : RECOMMENDED_QUALITIES;

  if (rawQualities.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "No valid qualities provided" }) };
  }

  // ── Determine chunk duration based on quality set ───────────────────────────
  const hasUltraHD = rawQualities.some((q) => HIGH_RES_QUALITIES.includes(q));
  const isRecommendedOnly =
    rawQualities.length === RECOMMENDED_QUALITIES.length &&
    rawQualities.every((q) => RECOMMENDED_QUALITIES.includes(q));

  const chunkDurationMinutes = hasUltraHD ? 4 : isRecommendedOnly ? 20 : 8;
  const chunkDurationSeconds = chunkDurationMinutes * 60;

  const runId = Math.random().toString(36).substring(2, 10) + "-" + Date.now();

  // ── Enqueue the SPLIT task ───────────────────────────────────────────────────
  const splitTask: SplitTask = {
    taskType: "SPLIT",
    videoId,
    sourceS3Url,
    qualities: rawQualities,
    durationSeconds,
    callbackUrl,
    runId,
  };

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL!,
      MessageGroupId: videoId,
      MessageDeduplicationId: `split-${videoId}-${runId}`,
      MessageBody: JSON.stringify(splitTask),
      MessageAttributes: {
        chunkDurationSeconds: {
          DataType: "Number",
          StringValue: String(chunkDurationSeconds),
        },
      },
    })
  );

  // ── Insert pipeline DB row immediately ──────────────────────────────────────
  // Create the row NOW so status is visible from the moment the trigger fires.
  // (Before this fix, the row only appeared when SPLIT_COMPLETE was received ~10min later.)
  try {
    const sql = createPipelineSql();
    await ensureTable(sql);
    await createVideoState(sql, videoId, rawQualities, durationSeconds);
    console.log(`[trigger] Pipeline DB row created for videoId=${videoId} with status=SPLITTING`);
  } catch (dbErr: unknown) {
    // Non-fatal: log and continue — the callback will upsert the row on SPLIT_COMPLETE
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error(`[trigger] Failed to pre-create pipeline DB row: ${msg}`);
  }

  // ── Pre-boot ALL required instances at trigger time ───────────────────────────
  //
  // KEY DESIGN: We boot ALL required instances immediately (not just 1) so they
  // all boot in parallel during the SPLIT phase (~5-10 min). By the time encoding
  // tasks appear in SQS, ALL instances are already ready and can pull chunks
  // concurrently — giving true parallel encoding.
  //
  // If duration is unknown, we boot 1 instance (conservative). The SPLIT_COMPLETE
  // callback will scale up more once the real duration is known.
  //
  const runningWorkers = await getRunningWorkerCount(ec2);

  // Calculate target instance count. If duration is unknown, default to 1.
  const targetCount = durationSeconds
    ? calcInstanceCount(durationSeconds, rawQualities)
    : 1;

  let launchedInstances: string[] = [];

  if (runningWorkers >= targetCount) {
    // Existing cluster has enough capacity — reuse it.
    console.log(
      `[trigger] ${runningWorkers} workers already running (target=${targetCount}). Reusing existing cluster.`
    );
  } else {
    // Boot the gap to reach the target count.
    const toLaunch = targetCount - runningWorkers;
    console.log(
      `[trigger] Booting ${toLaunch} Spot instance(s) upfront (running=${runningWorkers}, target=${targetCount}).`
    );
    launchedInstances = await launchWorkerInstances(ec2, toLaunch, videoId, chunkDurationSeconds);
  }

  console.log(
    JSON.stringify({
      event: "PIPELINE_STARTED",
      videoId,
      instanceCount: launchedInstances.length,
      instanceIds: launchedInstances,
      qualities: rawQualities,
      chunkDurationMinutes,
      targetCount,
      reusingCluster: runningWorkers >= targetCount,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Video pipeline started",
      videoId,
      instanceCount: launchedInstances.length,
      instanceIds: launchedInstances,
      qualities: rawQualities,
      chunkDurationMinutes,
      targetCount,
      reusingCluster: runningWorkers >= targetCount,
    }),
  };
};
