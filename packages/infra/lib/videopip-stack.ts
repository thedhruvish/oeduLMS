import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

export interface VideoPipelineProps extends cdk.StackProps {
  r2Bucket: string;
  r2AccountId: string;
  r2SecretName: string;
  cfWorkerCallbackUrl: string;
  pipelineSecret: string;
  amiId: string;
  /** Neon DB URL for pipeline state tracking (separate from main app DB) */
  pipelineDatabaseUrl: string;
  keyPairName?: string;
}

/**
 * VideoPipelineStack
 *
 * Resources:
 *  - SQS FIFO Queue (video task queue)
 *  - S3 bucket (staging: raw video + chunks)
 *  - S3 bucket (worker assets: ec2-video-worker.tar.gz)
 *  - DynamoDB table (chunk completion tracking)
 *  - IAM Role for EC2 spot instances
 *  - Lambda: triggerHandler       — CF Worker → start pipeline
 *  - Lambda: callbackHandler      — EC2 worker → event forwarding + master playlist
 *  - Lambda: relaunchHandler      — re-launch spot instance after interruption
 *  - Lambda: spotInterruptionHandler — EventBridge → catch spot termination warning
 *  - API Gateway: exposes triggerHandler + callbackHandler + relaunchHandler
 *  - EventBridge rule: EC2 Spot Interruption Warning → spotInterruptionHandler
 */
export class VideoPipelineStack extends cdk.Stack {
  /** Public API Gateway URL base (set in stack outputs) */
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: VideoPipelineProps) {
    super(scope, id, props);

    // ── 1. SQS FIFO Queue ────────────────────────────────────────────────────
    const videoQueue = new sqs.Queue(this, "VideoProcessingQueue", {
      queueName: "VideoProcessing.fifo",
      fifo: true,
      contentBasedDeduplication: true,
      // Visibility timeout must be longer than the longest task (SPLIT on big file ≈ 25 min)
      visibilityTimeout: cdk.Duration.minutes(35),
      // After 3 failed attempts, move to DLQ
      deadLetterQueue: {
        queue: new sqs.Queue(this, "VideoDLQ", {
          queueName: "VideoProcessingDLQ.fifo",
          fifo: true,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    // ── 2. S3 Staging Bucket (raw upload + chunks) ───────────────────────────
    const stagingBucket = new s3.Bucket(this, "VideoStagingBucket", {
      bucketName: `oedulms-video-staging-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      // Lifecycle: delete chunks after 7 days (they're already on R2)
      lifecycleRules: [
        {
          prefix: "chunks/",
          expiration: cdk.Duration.days(7),
          id: "DeleteChunksAfter7Days",
        },
        {
          prefix: "raw/",
          expiration: cdk.Duration.days(3),
          id: "DeleteRawAfter3Days",
        },
      ],
    });

    // ── 3. Worker Assets Bucket (EC2 bootstrap code) ─────────────────────────
    const workerAssetsBucket = new s3.Bucket(this, "WorkerAssetsBucket", {
      bucketName: `oedulms-worker-assets-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── 4. (No DynamoDB) — chunk tracking lives in pipeline Neon DB ─────────

    // ── 5. IAM Role for EC2 Spot Instances ───────────────────────────────────
    const ec2Role = new iam.Role(this, "VideoWorkerRole", {
      roleName: "oedulms-video-worker-role",
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: "Role for EC2 spot video worker instances",
      managedPolicies: [
        // For CloudWatch Logs
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"),
      ],
    });

    // Allow reading from staging bucket (raw video + chunks for download)
    stagingBucket.grantReadWrite(ec2Role);
    // Allow reading worker assets
    workerAssetsBucket.grantRead(ec2Role);
    // Allow consuming from the queue
    videoQueue.grantConsumeMessages(ec2Role);
    // Allow sending to the queue (SPLIT handler enqueues ENCODE_CHUNK tasks)
    videoQueue.grantSendMessages(ec2Role);

    const ec2InstanceProfile = new iam.CfnInstanceProfile(this, "VideoWorkerProfile", {
      instanceProfileName: "oedulms-video-worker-profile",
      roles: [ec2Role.roleName],
    });

    // ── 6. Lambda Execution Role ──────────────────────────────────────────────
    const lambdaRole = new iam.Role(this, "PipelineLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    // Lambda needs to launch spot instances
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:RunInstances",
          "ec2:DescribeInstances",
          "ec2:DescribeSpotPriceHistory",
          "iam:PassRole",
        ],
        resources: ["*"],
      })
    );

    videoQueue.grantSendMessages(lambdaRole);
    videoQueue.grantConsumeMessages(lambdaRole);
    stateTable.grantReadWriteData(lambdaRole);
    workerAssetsBucket.grantRead(lambdaRole);

    // ── 7. Shared Lambda environment ─────────────────────────────────────────
    const sharedEnv: Record<string, string> = {
      QUEUE_URL: videoQueue.queueUrl,
      S3_BUCKET: stagingBucket.bucketName,
      WORKER_ASSETS_BUCKET: workerAssetsBucket.bucketName,
      INSTANCE_PROFILE_ARN: ec2InstanceProfile.attrArn,
      AMI_ID: props.amiId,
      R2_ACCOUNT_ID: props.r2AccountId,
      R2_BUCKET: props.r2Bucket,
      R2_SECRET_NAME: props.r2SecretName,
      CF_WORKER_CALLBACK_URL: props.cfWorkerCallbackUrl,
      PIPELINE_SECRET: props.pipelineSecret,
      PIPELINE_DATABASE_URL: props.pipelineDatabaseUrl,
    };

    // ── 8. Lambda: Trigger ────────────────────────────────────────────────────
    const triggerFn = new lambda.Function(this, "TriggerLambda", {
      functionName: "oedulms-video-trigger",
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("../../apps/aws-lambda-trigger/dist"),
      handler: "index.triggerHandler",
      timeout: cdk.Duration.minutes(2),
      memorySize: 256,
      role: lambdaRole,
      environment: sharedEnv,
    });

    // ── 9. Lambda: Callback ───────────────────────────────────────────────────
    const callbackFn = new lambda.Function(this, "CallbackLambda", {
      functionName: "oedulms-video-callback",
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("../../apps/aws-lambda-trigger/dist"),
      handler: "index.callbackHandler",
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      role: lambdaRole,
      environment: sharedEnv,
    });

    // ── 10. Lambda: Status (called by CF Worker admin endpoint) ───────────────
    const statusFn = new lambda.Function(this, "StatusLambda", {
      functionName: "oedulms-video-status",
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("../../apps/aws-lambda-trigger/dist"),
      handler: "index.statusHandler",
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      role: lambdaRole,
      environment: sharedEnv,
    });

    // ── 11. Lambda: Spot Interruption ────────────────────────────────────
    const spotFn = new lambda.Function(this, "SpotInterruptionLambda", {
      functionName: "oedulms-spot-interruption",
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("../../apps/aws-lambda-trigger/dist"),
      handler: "index.spotInterruptionHandler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      role: lambdaRole,
      environment: sharedEnv,
    });

    // ── 12. EventBridge: EC2 Spot Interruption Warning ───────────────────────
    new events.Rule(this, "SpotInterruptionRule", {
      ruleName: "oedulms-spot-interruption",
      description: "Catch EC2 Spot Instance Interruption Warnings",
      eventPattern: {
        source: ["aws.ec2"],
        detailType: ["EC2 Spot Instance Interruption Warning"],
      },
      targets: [new targets.LambdaFunction(spotFn)],
    });

    // ── 13. API Gateway ───────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, "VideoPipelineAPI", {
      restApiName: "oedulms-video-pipeline",
      description: "Video processing pipeline API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: "prod",
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    // POST /trigger
    const triggerResource = api.root.addResource("trigger");
    triggerResource.addMethod("POST", new apigateway.LambdaIntegration(triggerFn), {
      apiKeyRequired: true, // require API key so only CF Worker can call
    });

    // POST /callback  — EC2 workers POST events here
    const callbackResource = api.root.addResource("callback");
    callbackResource.addMethod("POST", new apigateway.LambdaIntegration(callbackFn));

    // GET /status  — CF Worker admin polls video state here
    const statusResource = api.root.addResource("status");
    statusResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(statusFn),
      { apiKeyRequired: true } // only CF Worker (with API key) can call this
    );

    // ── 14. API Key ───────────────────────────────────────────────────────────
    const apiKey = new apigateway.ApiKey(this, "PipelineApiKey", {
      apiKeyName: "oedulms-pipeline-key",
      description: "API key for CF Worker to call the video pipeline",
    });

    const usagePlan = new apigateway.UsagePlan(this, "PipelineUsagePlan", {
      name: "oedulms-pipeline-plan",
      apiStages: [{ api, stage: api.deploymentStage }],
      throttle: { rateLimit: 50, burstLimit: 100 },
    });
    usagePlan.addApiKey(apiKey);

    // EC2 worker uses the /callback URL — bake it in at deploy time
    const callbackApiUrl = `${api.url}callback`;
    callbackFn.addEnvironment("LAMBDA_CALLBACK_URL", callbackApiUrl);
    triggerFn.addEnvironment("LAMBDA_CALLBACK_URL", callbackApiUrl);

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "Video pipeline API Gateway URL",
    });

    new cdk.CfnOutput(this, "TriggerUrl", {
      value: `${api.url}trigger`,
      description: "LAMBDA_TRIGGER_URL → wrangler secret put LAMBDA_TRIGGER_URL",
    });

    new cdk.CfnOutput(this, "CallbackUrl", {
      value: callbackApiUrl,
      description: "EC2 workers POST events here (baked into worker UserData)",
    });

    new cdk.CfnOutput(this, "StatusUrl", {
      value: `${api.url}status`,
      description: "LAMBDA_STATUS_URL → wrangler secret put LAMBDA_STATUS_URL",
    });

    new cdk.CfnOutput(this, "StagingBucketName", {
      value: stagingBucket.bucketName,
    });

    new cdk.CfnOutput(this, "WorkerAssetsBucketName", {
      value: workerAssetsBucket.bucketName,
    });

    new cdk.CfnOutput(this, "QueueUrl", {
      value: videoQueue.queueUrl,
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: apiKey.keyId,
      description:
        "LAMBDA_API_KEY → get value from API Gateway console then run wrangler secret put LAMBDA_API_KEY",
    });

    this.apiUrl = api.url;
  }
}
