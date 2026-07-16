#!/bin/bash
set -e

# OeduLMS Video Transcoding Pipeline Build & Deploy Script
# Automates building the monorepo, packaging/uploading the EC2 worker, and deploying AWS CDK stack.

echo "========================================================="
echo "🚀 Starting OeduLMS Video Pipeline Build & Deploy"
echo "========================================================="

# 1. Build monorepo packages
echo ""
echo "📦 Step 1: Compiling monorepo workspace packages..."
bun run build

# 2. Build trigger Lambda bundle directly
echo ""
echo "⚡ Step 2: Compiling AWS Lambda Trigger bundle..."
bun run --filter aws-lambda-trigger build

# 3. Package the EC2 worker tarball
echo ""
echo "📦 Step 3: Packaging EC2 Video Worker tarball..."
bun run --filter ec2-video-worker package

# 4. Upload worker tarball to S3 assets bucket
echo ""
echo "☁️ Step 4: Uploading EC2 Video Worker tarball to AWS S3..."
aws s3 cp apps/ec2-video-worker/ec2-video-worker.tar.gz s3://oedulms-worker-assets-379929762145/ec2-video-worker.tar.gz

# 5. Deploy AWS CDK stack
echo ""
echo "🚀 Step 5: Deploying AWS CDK Infrastructure Stack..."
bun run --filter infra cdk deploy --require-approval never

# 6. Rebuild backend server
echo ""
echo "🖥️ Step 6: Rebuilding Backend Server..."
bun run --filter server build

echo ""
echo "========================================================="
echo "✅ Video Transcoding Pipeline successfully deployed!"
echo "========================================================="
