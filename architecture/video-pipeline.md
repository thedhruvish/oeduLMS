# Serverless Video Transcoding Pipeline

The media rendering engine of ProTech LMS utilizes an event-driven transcoding pipeline. By using AWS Lambda serverless functions alongside dynamically scaled AWS EC2 Spot instances, the system provides reliable transcoding at a fraction of the cost of standard media services.

---

## ⚙️ Core Architecture & Flow

```
[Teacher Upload] ──> [Cloudflare R2 Bucket] ──(Trigger API via cf Worker)──> [Lambda Trigger]
                                                                                       │
  ┌────────────────────────────────────────────────────────────────────────────────────┘
  ├──> [Spawn EC2 Spot Instances] (Scale: 1 instance per hour of video)
  └──> [Enqueue SPLIT Task] ──> [SQS FIFO Queue]
                                      │
  ┌───────────────────────────────────┘
  ├──> [Worker: SPLIT Task] ──> Downloads raw video from R2, splits into chunks, enqueues ENCODE tasks to SQS
  └──> [Worker: ENCODE Task] ──> Downloads chunk, transcodes quality ladder, uploads final HLS chunks back to R2
                                      │
  ┌───────────────────────────────────┘
  └──> [Lambda Callback] ──> Tracks chunk count in Pipeline DB
              │
              └──> [All Chunks Done] ──> Builds master.m3u8, pings Cloudflare Edge API
```

---

## 🔄 Two-Phase Processing Strategy (Speed & Segment Optimization)

The video processing pipeline splits the transcoding process into two distinct, optimized phases to balance throughput speed with playback quality:

### 1. Phase 1: Fast Stream-Copy Splitting (Demuxing)

To speed up the initial processing time and get parallel worker instances running immediately:

- **No Re-encoding**: The raw video is downloaded from Cloudflare R2 by the splitting worker node and divided into chunks without any CPU-heavy video or audio transcoding.
- **Stream Copy Mode**: The process uses FFmpeg's stream-copy command (copying audio and video codecs directly using `-c copy`).
- **Dynamic Chunk Sizing**: The duration of each split chunk is calculated dynamically based on the requested video resolutions (e.g. 20-minute chunks for standard 1080p, 8-minute chunks for custom configurations, and 4-minute chunks for 4K/UHD quality profiles) to control file sizes and avoid duplicate work in case of compute interrupts.
- **Result**: The split executes almost instantaneously (usually within seconds) and immediately publishes the chunk tasks to the SQS FIFO queue for parallel processing.

### 2. Phase 2: Parallel HLS Encoding & 4-Second Segmenting

Once individual chunk tasks are pulled from the queue:

- **Adaptive Quality Transcoding**: Worker nodes transcode each chunk into the requested quality bitrate ladder (e.g., 360p, 720p, 1080p) using CPU resources.
- **4-Second Segments**: The transcoded quality streams are segmented into exactly **4-second HLS segments** (`.ts` files).
- **HLS Segment Stitching**: Once all chunks complete transcoding, the callback Lambda downloads each chunk's playlist, parses the segment metadata, prepends relative chunk directories (e.g. `../chunks/chunk_000/h144/segment_0000.ts`), and stitches them sequentially into a single continuous media playlist. This ensures playability since HLS clients do not support nested VOD playlists.
- **Result**: Sizing HLS segments to exactly 4 seconds allows smooth ABR (Adaptive Bitrate) switching, reduces latency, and supports seamless playback of the stitched HLS segments.

---

## ⏱️ Chunk Sizing Strategy

To speed up processing and prevent workers from losing too much progress if an EC2 Spot instance is interrupted, video chunks are sized dynamically based on the requested quality ladder:

| Quality Ladder                                          | Chunk Duration | Technical Rationale                                                                               |
| :------------------------------------------------------ | :------------- | :------------------------------------------------------------------------------------------------ |
| **Recommended Only** (`360p`, `720p`, `1080p`)          | **20 Minutes** | Maximizes splitting speed, minimizes R2 object counts, and lowers total cost.                     |
| **Custom / Lower Resolution** (No `1440p+`)             | **8 Minutes**  | Balances processing duration with restart granularity under spot interruptions.                   |
| **Ultra High Definition** (Includes `1440p` to `4320p`) | **4 Minutes**  | Creates smaller chunk files so interrupted workers don't lose massive chunks of transcoding work. |

---

## 📈 EC2 Spot Instance Scaling

Compute worker instances scale dynamically based on the total transcoding workload, considering both the **video duration** and the **number/complexity of requested qualities** (using weighted values ranging from `0.2` for 144p to `10.0` for 8K resolution):

$$\text{Virtual Duration} = \text{Duration in Seconds} \times \sum_{q \in \text{qualities}} \text{Weight}(q)$$

$$\text{Instance Count} = \text{Clamp}\left(1,\ \left\lceil\frac{\text{Virtual Duration}}{3600}\right\rceil,\ 8\right)$$

- **30-Minute Video** with **8 standard qualities** (Sum of Weights = `6.2`):
  - $\text{Virtual Duration} = 1800 \times 6.2 = 11,160\text{ seconds (3.1 hours)}$
  - $\text{Instance Count} = 4\text{ Instances}$.
- **1 Hour Video** with **recommended qualities only** (Sum of Weights = `3.0`):
  - $\text{Virtual Duration} = 3600 \times 3.0 = 10,800\text{ seconds (3 hours)}$
  - $\text{Instance Count} = 3\text{ Instances}$.
- **30-Minute Video** with **144p only** (Sum of Weights = `0.2`):
  - $\text{Virtual Duration} = 1800 \times 0.2 = 360\text{ seconds (0.1 hours)}$
  - $\text{Instance Count} = 1\text{ Instance}$.

### 🔄 Two-Stage Capacity-Aware Scaling

To optimize AWS costs and prevent idle compute waste:

1. **Trigger Stage (SPLIT Phase):** Only **1 worker instance** is needed to perform the fast video splitting. The Trigger Lambda queries the active running/pending EC2 Spot instances. If any worker is already running, it boots **0 new instances** (reusing the existing cluster). If no workers are active, it boots **exactly 1 instance** to kick off the SPLIT task.
2. **Callback Stage (ENCODE Phase):** Once splitting finishes, the callback Lambda calculates the target instance count ($N$) required for the encoding load. It queries active worker count ($C$). If $C < N$, it dynamically launches the difference ($N - C$ additional instances) to encode the chunks in parallel. If $C \geq N$, it boots **0 new instances**, fully reusing the cluster.

All spawned EC2 Spot instances process tasks concurrently from the same shared SQS FIFO queue (`VideoProcessing.fifo`), balancing the load dynamically.

---

## 📡 Video Bitrate & Quality Ladder

The transcoding engine compiles raw videos into an Adaptive Bitrate (ABR) HLS folder containing segment streams matching the following specifications:

| Resolution Name | Resolution (WxH) | Video Bitrate | Audio Bitrate | Target Bandwidth |
| :-------------- | :--------------- | :------------ | :------------ | :--------------- |
| **144p**        | 256x144          | 100k          | 32k           | 150 Kbps         |
| **240p**        | 426x240          | 300k          | 64k           | 400 Kbps         |
| **360p** (Rec)  | 640x360          | 600k          | 96k           | 800 Kbps         |
| **480p**        | 854x480          | 1000k         | 128k          | 1.4 Mbps         |
| **540p**        | 960x540          | 1500k         | 128k          | 2 Mbps           |
| **720p** (Rec)  | 1280x720         | 2500k         | 128k          | 3 Mbps           |
| **900p**        | 1600x900         | 3500k         | 192k          | 4.5 Mbps         |
| **1080p** (Rec) | 1920x1080        | 5000k         | 192k          | 6 Mbps           |
| **1440p**       | 2560x1440        | 8000k         | 256k          | 10 Mbps          |
| **2160p**       | 3840x2160        | 16000k        | 320k          | 20 Mbps          |
| **4320p**       | 7680x4320        | 40000k        | 448k          | 50 Mbps          |

---

## 🛡️ Resilience & Interruption Strategy

Because Spot instances can be reclaimed by AWS at any time, the pipeline implements several resilience checks:

1.  **SQS Visibility Timeout (35 Min)**: When a worker starts a task, it hides the SQS message. If the worker is terminated abruptly before finishing, the task automatically becomes visible in SQS again for another worker to pick up.
2.  **Delete-on-Success**: Messages are only deleted from the queue after the transcoded chunk segments are successfully uploaded to Cloudflare R2.
3.  **Worker Heartbeat**: Long-running workers periodically extend their task's visibility timeout if transcoding is taking longer than expected.
4.  **2-Minute Interruption warning**:
    - An AWS EventBridge rule triggers a Lambda when AWS issues a spot interruption warning.
    - The EC2 worker script polls the local metadata service (`http://169.254.169.254`) every 5 seconds. If a warning is detected, the worker stops pulling new tasks, flushes its current logs, and shuts down gracefully.
5.  **Dead Letter Queue (DLQ)**: Tasks that fail 3 consecutive times are moved to a DLQ to prevent broken videos from causing infinite retries.

---

## ⚡ Automatic Curriculum Trigger & API Routing

The edge server manages video pipeline triggers automatically during course content management tasks:

### 1. API Endpoints

- `POST /api/admin/video/trigger-pipeline`: Manual endpoint to trigger video transcoding.
- `POST /api/public/video/pipeline-callback` (Secret HMAC Authenticated): AWS callback recipient that updates database records.
- `GET /api/public/video/:videoId/status`: Returns status and progress percentage.

### 2. Automatic Background Triggers

Trigger logic is integrated inside [apps/server/src/admin/curriculum.ts](../apps/server/src/admin/curriculum.ts):

- **On Lecture Creation (POST)**: If a `videoUrl` is present, the API triggers the AWS Lambda pipeline asynchronously in the background using Hono's `c.executionCtx.waitUntil(...)`, preventing HTTP client delays.
- **On Lecture Update (PUT)**: The server loads the existing `videoUrl` and compares it with the new payload. The pipeline is only triggered if the URL is modified, preventing unnecessary transcoding charges if only text fields were edited.

---

## 🔄 Main Database State Sync

As transcoding progress changes, the AWS callback Lambda updates two database tables:

1.  **`videos` Table**: Tracks high-level execution states (`IDLE` $\to$ `SPLITTING` $\to$ `ENCODING` $\to$ `READY` or `ERROR`).
2.  **`course_lectures` Table**: Updates the playable properties for the player:
    - **`SPLIT_COMPLETE`**: Sets video status to `ENCODING` and updates the lecture `duration` (in seconds).
    - **`MASTER_PLAYLIST_READY`**: Sets video status to `READY`, sets the lecture `hlsUrl` to the R2 HLS playlist path, and updates `publishedAt` to the current time.
    - **`ERROR`**: Sets the video and lecture state to `ERROR` and writes the message to the error logs.

---

## 📊 Frontend Polling & UI Progress Banners

### 1. Status Polling Hook

The frontend client uses the `useGetVideoStatus(videoId)` hook located in [apps/web/src/api/video.ts](../apps/web/src/api/video.ts):

- **Polling Interval**: Polls `/api/public/video/:videoId/status` every 5 seconds.
- **Auto-Termination**: Automatically disables polling once the status resolves to `READY` or `ERROR`.

### 2. Lecture Edit Sheet UI

Located in [apps/web/src/features/courses/lecture-sheet.tsx](../apps/web/src/features/courses/lecture-sheet.tsx), the sheet displays progress feedback:

- **Transcoding Progress Bar**: Animates real-time completion percentages.
- **Success Indicator**: Shows a green confirmation notice (`✓ Adaptive HLS stream generated successfully.`) when the video is ready.
- **Error Banner**: Highlights pipeline warnings and logs if the status is `ERROR`.

---

## 🛠️ Resilient System Adjustments

To ensure production reliability and prevent edge-case failures, the pipeline implements:

- **Integer Duration Casting**: Every input video duration is automatically normalized via `Math.round(durationSeconds || 0)` inside the `initVideoState` DB handler in `aws-lambda-trigger`. This prevents SQL driver syntax crashes when float durations are reported.
- **Double Protocol Protection**: Strips `https?://` dynamically from the `R2_PUBLIC_DOMAIN` environment variable in both the edge server and the callback Lambda. This guarantees that generated playlist URLs do not result in double protocol prefixes (such as `https://https://...`).
