# Serverless Video Transcoding Pipeline

This document details the architecture, data structures, and operational flows of the serverless video processing and transcoding pipeline built using AWS (Lambda, SQS, EC2 Spot, S3) and Cloudflare (Workers Hono, R2).

---

## Architectural Diagram & Flow

```mermaid
flowchart TD
    subgraph Cloudflare["Cloudflare (Edge)"]
        CW_Trigger["CF Worker (Hono)\nPOST /api/admin/video/trigger-pipeline"]
        CW_Callback["CF Worker\nPOST /api/public/video/pipeline-callback"]
        R2["Cloudflare R2\nvideos/<videoId>/..."]
    end

    subgraph AWS["AWS (Transcoding & Compute)"]
        APIGW["API Gateway"]
        L_Trigger["Lambda: Trigger\noedulms-video-trigger"]
        L_Callback["Lambda: Callback\noedulms-video-callback"]
        L_Status["Lambda: Status\noedulms-video-status"]
        L_Spot["Lambda: Interruption\noedulms-spot-interruption"]
        SQS["SQS FIFO Queue\nVideoProcessing.fifo"]
        S3["S3 Staging Bucket\noedulms-video-staging-..."]
        PDB[("Neon Pipeline DB\nvideo_pipeline_state")]
        EB["EventBridge\nSpot Interruption warning"]

        subgraph EC2_Workers["EC2 Spot Nodes (c5.2xlarge)"]
            W_Split["Worker (SPLIT task)"]
            W_Encode["Worker (ENCODE_CHUNK task)"]
        end
    end

    Teacher["Teacher / Admin\nUploads raw video to S3"]
    MainDB[("Main PostgreSQL DB\n(Videos & CourseLectures)")]

    Teacher -->|1. Upload raw video| S3
    Teacher -->|2. Trigger pipeline via curriculum APIs| CW_Trigger
    CW_Trigger -->|3. POST /trigger\n(x-api-key)| APIGW
    APIGW --> L_Trigger
    
    L_Trigger -->|4. Enqueue SPLIT task| SQS
    L_Trigger -->|5. Launch Spot Instances\nN = ceil(duration / 3600)| EC2_Workers

    W_Split -->|6. Poll SPLIT task| SQS
    W_Split -->|7. Download raw & split\n(No encoding stream-copy)| S3
    W_Split -->|8. Enqueue ENCODE_CHUNK tasks| SQS
    W_Split -->|9. POST SPLIT_COMPLETE| APIGW

    W_Encode -->|10. Poll ENCODE_CHUNK task| SQS
    W_Encode -->|11. Download chunk & transcode| S3
    W_Encode -->|12. Transcode to HLS & upload| R2
    W_Encode -->|13. POST CHUNK_ENCODE_COMPLETE| APIGW

    APIGW --> L_Callback
    L_Callback -->|14. Increment completed_chunks| PDB
    L_Callback -->|15. If all chunks done,\nfetch chunk playlists & stitch segments| R2
    
    L_Callback -->|16. Forward CF events\n(SPLIT_COMPLETE / READY / ERROR)| CW_Callback
    CW_Callback -->|17. Update state & set hlsUrl/duration| MainDB

    EB -->|2-Min Warning| L_Spot
    L_Spot -->|Let SQS visibility expire| SQS
```

---

## 1. Chunk Sizing Strategy

To balance splitting speed and resume granularity during spot terminations, different chunk durations are selected automatically based on the quality tiers requested by the user:

| Quality Ladder Requested | Chunk Duration | Reason |
|---|---|---|
| **Recommended Only** (`360p`, `720p`, `1080p`) | **20 Minutes** | Extremely fast split, minimizes total chunks, low S3/R2 object counts. |
| **Custom / Lower Resolution** (No `1440p+` included) | **8 Minutes** | Balances processing time and re-run granularity under spot interruptions. |
| **Ultra High Definition** (Includes `1440p`, `2160p`, or `4320p`) | **4 Minutes** | Small chunk files; prevents workers from losing massive amounts of encoding progress if interrupted. |

---

## 2. EC2 Spot Instance Scaling

Compute worker instances scale dynamically to match the actual workload, which is determined by both the **video duration** and the **number/complexity of requested qualities**. This ensures that short videos with many quality tiers do not get bottlenecked on a single instance.

### A. Quality Workload Weights
Each quality resolution tier is assigned a weight based on CPU transcoding complexity:
*   **144p:** `0.2` | **240p:** `0.3` | **360p:** `0.5`
*   **480p:** `0.7` | **540p:** `0.8` | **720p:** `1.0`
*   **900p:** `1.2` | **1080p:** `1.5`
*   **1440p:** `2.5` | **2160p (4K):** `5.0` | **4320p (8K):** `10.0`

### B. Formula
$$\text{Virtual Duration} = \text{Duration in Seconds} \times \sum_{q \in \text{qualities}} \text{Weight}(q)$$

$$\text{Instance Count} = \text{Clamp}\left(1,\ \left\lceil\frac{\text{Virtual Duration}}{3600}\right\rceil,\ 8\right)$$

We launch **1 Spot Instance per virtual hour** of transcoding work, capped at a minimum of `1` and a maximum of `8` instances to optimize speed while preventing runaway compute charges.

### C. Example Calculations
1.  **30 Min (1800s) Video** with all **8 standard ABR qualities** (Sum of Weights = `6.2`):
    *   $\text{Virtual Duration} = 1800 \times 6.2 = 11,160\text{ seconds (3.1 hours)}$
    *   $\text{Instance Count} = \lceil 11,160 / 3600 \rceil = 4\text{ instances}$
2.  **3 Hour (10800s) Video** with **recommended qualities only** (`[360p, 720p, 1080p]`, Sum of Weights = `3.0`):
    *   $\text{Virtual Duration} = 10800 \times 3.0 = 32,400\text{ seconds (9 hours)}$
    *   $\text{Instance Count} = \min(8, \lceil 32,400 / 3600 \rceil) = 8\text{ instances (capped)}$
3.  **30 Min (1800s) Video** with **144p only** (Weight = `0.2`):
    *   $\text{Virtual Duration} = 1800 \times 0.2 = 360\text{ seconds (0.1 hours)}$
    *   $\text{Instance Count} = \lceil 360 / 3600 \rceil = 1\text{ instance}$

### D. Two-Stage Capacity-Aware Scaling
To optimize costs and compute utilization:
1.  **Trigger Phase (SPLIT):**
    *   Splitting raw video is a fast, single-threaded copy task that only requires one worker.
    *   The Trigger Lambda queries active workers (running/pending). If **no workers** exist, it boots **exactly 1** instance. If **at least 1** worker is active, it boots **0** new instances, relying on the existing cluster.
2.  **Callback Phase (ENCODE):**
    *   Once splitting finishes, `CallbackLambda` calculates the required target instance count ($N$) based on the parsed video duration and qualities.
    *   It queries the current running worker count ($C$).
    *   If $C < N$, it boots the difference ($N - C$ additional instances) to encode the chunks in parallel.
    *   If $C \geq N$, it boots **0** new instances, fully utilizing the existing active capacity.

All spawned instances process tasks concurrently from the same shared SQS FIFO queue (`VideoProcessing.fifo`), auto-balancing the load.

---

## 3. Video Quality Bitrate Ladder

Adaptive Bitrate (ABR) transcoding configuration details:

| Resolution Name | Resolution (WxH) | Video Bitrate | Audio Bitrate | Target Bandwidth |
|---|---|---|---|---|
| **144p** | 256x144 | 100k | 32k | 150 Kbps |
| **240p** | 426x240 | 300k | 64k | 400 Kbps |
| **360p** (Rec) | 640x360 | 600k | 96k | 800 Kbps |
| **480p** | 854x480 | 1000k | 128k | 1.4 Mbps |
| **540p** | 960x540 | 1500k | 128k | 2 Mbps |
| **720p** (Rec) | 1280x720 | 2500k | 128k | 3 Mbps |
| **900p** | 1600x900 | 3500k | 192k | 4.5 Mbps |
| **1080p** (Rec) | 1920x1080 | 5000k | 192k | 6 Mbps |
| **1440p** | 2560x1440 | 8000k | 256k | 10 Mbps |
| **2160p** | 3840x2160 | 16000k | 320k | 20 Mbps |
| **4320p** | 7680x4320 | 40000k | 448k | 50 Mbps |

---

## 4. Database Schema Configurations

### A. Pipeline DB (Separate Neon DB instance)
Stores local chunk completion counters to protect the main DB from high-frequency transcoding updates.

```sql
CREATE TABLE video_pipeline_state (
  video_id          TEXT        PRIMARY KEY,
  status            TEXT        NOT NULL DEFAULT 'SPLITTING', -- SPLITTING, ENCODING, READY, ERROR
  duration_seconds  INTEGER,
  total_chunks      INTEGER,
  completed_chunks  INTEGER     NOT NULL DEFAULT 0,
  qualities         TEXT,       -- JSON array string (e.g., '[360,720,1080]')
  master_url        TEXT,       -- HLS master playlist public URL (R2 Custom Domain)
  error_message     TEXT,       -- Details if status = ERROR
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### B. Main Application DB (`packages/db/src/schema/`)
- `videos` table: Tracks high-level states (`IDLE`, `SPLITTING`, `ENCODING`, `READY`, `ERROR`) and original details.
- `course_lectures` table: Contains the `hls_url` (HLS playback URL) and `duration` (length in seconds) columns.

---

## 5. Event and Lifecycle States

### Video Processing Flow
`IDLE` $\to$ `SPLITTING` $\to$ `ENCODING` $\to$ `READY` or `ERROR`.

### EC2 $\to$ AWS Lambda Events
All internal callback events from EC2 workers are sent to AWS Lambda:
1.  **`SPLIT_COMPLETE`**: Emitted when the worker completes cutting the raw video into chunks.
2.  **`CHUNK_ENCODE_COMPLETE`**: Emitted when a specific chunk is transcoded to all selected resolutions, converted to 4-second `.ts` segments, and uploaded to R2.
3.  **`ERROR`**: Sent if a worker experiences a fatal processing error.

### AWS Lambda $\to$ Cloudflare Worker Events
To minimize bandwidth and execution costs, Lambda filters events and only forwards critical state shifts to the Cloudflare Worker via `POST /api/public/video/pipeline-callback`:

1.  **`SPLIT_COMPLETE`**:
    *   *Payload:* `{ event: "SPLIT_COMPLETE", videoId, durationSeconds, totalChunks }`
    *   *CF Action:* Sets `processingStatus` to `ENCODING` in `videos` and updates the lecture `duration` (in seconds) in `course_lectures`.
2.  **`MASTER_PLAYLIST_READY`**:
    *   *Payload:* `{ event: "MASTER_PLAYLIST_READY", videoId, masterPlaylistR2Key }`
    *   *CF Action:* Sets `processingStatus` to `READY` in `videos`, sets `hlsUrl` in `course_lectures` to the R2 playlist play URL, and sets `publishedAt` to the current time.
3.  **`ERROR`**:
    *   *Payload:* `{ event: "ERROR", videoId, message }`
    *   *CF Action:* Transitions `videos` and `course_lectures` state to `ERROR` and stores error details.

---

## 6. Resilience & Spot Interruption Strategy

*   **SQS Visibility Timeout (35 Min)**: The message stays hidden while the worker executes. If a spot instance is terminated abruptly or loses power, the message automatically re-appears in SQS and is consumed by a replacement instance.
*   **Delete-on-Success & Error-Cleanup**: The EC2 worker deletes the SQS message after completing the uploads. If a caught application/task execution failure occurs, the worker sends an error callback and immediately deletes the message from SQS. This prevents failed tasks from repeatedly locking the SQS FIFO Message Group for the duration of the visibility timeout.
*   **Worker Heartbeat**: Long-running workers periodically extend the message visibility timeout via `ChangeMessageVisibilityCommand` if a task is taking longer than expected.
*   **Spot Interruption Warnings**: EventBridge triggers the `spotInterruptionHandler` Lambda when AWS broadcasts the 2-minute instance termination warning. Additionally, the worker polls the local EC2 metadata service (`http://169.254.169.254`) every 5 seconds to gracefully stop pulling new tasks and flush log events before termination.
*   **Dead-Letter Queue (DLQ)**: SQS drops failing tasks into a DLQ after 3 failed processing attempts to prevent infinite retry loops.

---

## 7. Curriculum API & Worker Routing

### Hono API Endpoints (Cloudflare Worker)
*   `POST /api/admin/video/trigger-pipeline`: Manually trigger the transcoding pipeline for a video.
*   `POST /api/public/video/pipeline-callback` (Secret Authenticated): Lambda callback receiver.
*   `GET /api/public/video/:videoId/status`: Unified status polling endpoint. Returns uploading state or proxies to Lambda status.

### Automatic Curriculum Trigger (`apps/server/src/admin/curriculum.ts`)
*   **Lecture Creation (`POST`):** If a `videoUrl` is supplied, it automatically triggers the AWS Lambda pipeline in the background using Hono's non-blocking `c.executionCtx.waitUntil(...)`.
*   **Lecture Update (`PUT`):** Fetches the previous `videoUrl` from the database. It triggers the transcoding pipeline **only if** the updated `videoUrl` is different from the older one (avoiding duplicate triggers if other metadata is changed).

---

## 8. Frontend Integration (TanStack Query)

### Custom API Hook (`apps/web/src/api/video.ts`)
Exposes `useGetVideoStatus(videoId)` using React Query. Automatically polls `/api/public/video/:videoId/status` in the background:
*   **Polling Interval:** 5 seconds.
*   **Auto-Termination:** Polling terminates automatically once the status reaches `READY` or `ERROR`.

### Lecture Edit Sheet (`apps/web/src/features/courses/lecture-sheet.tsx`)
Displays a real-time transcoding banner under the video field with:
1.  **Animated Progress:** An active progress bar showing the exact percentage of transcoded segments.
2.  **Ready Checkmark:** A green confirmation showing `✓ Adaptive HLS stream generated successfully.` once processing is finished.
3.  **Errors:** Warning flags displaying the pipeline error message.

---

## 9. Operational Enhancements & Cost Optimization

To reduce storage costs, eliminate idle compute charges, and improve developer diagnostics, the following features have been added:

### A. Immediate S3 Staging Cleanup
*   **Action:** Once a chunk completes encoding to all qualities and is uploaded to Cloudflare R2, the worker invokes a `DeleteObjectCommand` to immediately delete the raw chunk file (e.g., `chunks/<videoId>/chunk_000.mp4`) from the AWS S3 staging bucket.
*   **Benefit:** Reduces S3 active storage fees by removing intermediate files as soon as they are no longer required, rather than waiting for the 7-day S3 Lifecycle expiration.

### B. Fast Idle Auto-Shutdown (30-Second Timeout)
*   **Action:** The worker polls the SQS FIFO queue. If the queue is empty for **30 seconds** consecutively, the worker triggers `shutdown -h now` on the OS.
*   **Spot Instance Termination:** Since Spot Instances cannot be "stopped," AWS immediately transitions the instance state to `terminated` when the OS shuts down.
*   **Benefit:** Eliminates idle instance billing. Compute costs stop automatically within ~30-50 seconds of completing all transcoding tasks.

### C. Developer SSH Diagnostics
*   **KeyPair Association:** Trigger Lambda passes the KeyPair name `us-debian-oed` (`key-0816459a17b6bf1c1`) during `RunInstances` execution.
*   **Security Group:** Automatic creation of security group `oedulms-video-worker-sg` in the default VPC which opens port `22` (SSH) inbound from anywhere.
*   **Helper Log Script:** A diagnostics helper script `show-logs.sh` is packaged and extracted to `/app/show-logs.sh` on the instance. Running `sudo /app/show-logs.sh` tails system boot logs or worker progress live.

### D. Robust Callback Parsing
*   The callback Lambda function automatically unpacks nested body payloads, seamlessly supporting both wrapped (`{ event: payload }`) and raw JSON payloads.

### E. YouTube Video & Generic HTTP Video Direct Processing
*   **Action:** When the trigger payload contains a YouTube video URL (matching `youtube.com` or `youtu.be` patterns), the worker bypasses S3 downloads. It invokes `yt-dlp` with iOS client spoofing and optional cookie fallbacks (`cookies.txt` pulled from S3 worker assets bucket) to download the best MP4 audio/video streams, merges them into a temporary local file, and transcodes them.
*   **Generic HTTP/HTTPS Downloads:** If the input URL is a direct HTTP/HTTPS URL (e.g. `https://protech-assets.dhruvish.in/...`), it is downloaded directly using `curl` rather than treating it as an `s3://` URL, preventing invalid protocol parser errors.
*   **System Setup:** `yt-dlp` is automatically installed on boot on clean Debian 12 base AMIs via the EC2 UserData bootstrap script.

### F. SQS FIFO Deduplication Protection (`runId`)
*   **Action:** To prevent SQS FIFO from silently discarding manually re-triggered transcode messages within its 5-minute deduplication window, every triggered pipeline run is assigned a unique `runId` (e.g. timestamp + random string). All SQS message deduplication IDs (both for splitting and encoding tasks) incorporate this `runId`.

### G. Manual Re-Trigger Endpoint
*   **Route:** `POST /api/admin/video/re-trigger`
*   **Action:** Queries the existing lecture metadata by ID, resets the database video state to `SPLITTING`, and sends a new message to SQS using a fresh `runId` to trigger processing.

### H. Worker S3 Log Persistence
*   **Action:** The worker dynamically resolves its EC2 instance ID on boot. It uploads its processing logs (`/var/log/video-worker.log`) to the S3 staging bucket under `logs/<instanceId>/worker.log` every 60 seconds and performs a final blocking flush during instance shutdown.

### I. HLS Media Playlist Segment Stitching
*   **Action:** When compiling the final variant playlists, the Callback Lambda downloads the individual chunk playlists from R2, parses and extracts the `#EXTINF` segment tags, prepends the relative path to the chunk folder (e.g., `../chunks/chunk_000/h144/segment_0000.ts`), and stitches them into a single continuous media playlist. It dynamically aggregates target durations across chunks. This resolves playback failures since HLS clients do not support nested VOD playlists.

### J. Float Duration Rounding Protection
*   **Action:** To prevent driver crashes in Neon Postgres database insertion queries (expecting integer values for `duration_seconds`), the callback Lambda wraps incoming float values with `Math.round(durationSeconds || 0)` inside the `initVideoState` database logic.

### K. Double Protocol Prefix Prevention
*   **Action:** Strips protocol prefixes (`https://` or `http://`) dynamically from the `R2_PUBLIC_DOMAIN` environment variable in both the Lambda callback handler and server endpoints to prevent double protocol construction (e.g. `https://https://...`).
