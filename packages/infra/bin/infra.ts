#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { VideoPipelineStack } from "../lib/videopip-stack";

const app = new cdk.App();

new VideoPipelineStack(app, "OeduLMSVideoPipeline", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  // ── Required props — override via cdk deploy --context or env vars ─────────
  r2Bucket: process.env.R2_BUCKET ?? "oedulms-video",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "YOUR_CF_ACCOUNT_ID",
  r2SecretName: process.env.R2_SECRET_NAME ?? "oedulms/r2-credentials",
  cfWorkerCallbackUrl:
    process.env.CF_WORKER_CALLBACK_URL ??
    "https://oedulms-server.workers.dev/api/public/video/pipeline-callback",
  pipelineSecret: process.env.PIPELINE_SECRET ?? "change-me-in-production",
  pipelineDatabaseUrl: process.env.PIPELINE_DATABASE_URL ?? "",
  // Replace with your custom AMI containing ffmpeg + Node.js 20
  amiId: process.env.AMI_ID ?? "ami-0123456789abcdef0",
  keyPairName: process.env.KEY_PAIR_NAME,
});
