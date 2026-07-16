# ProTech LMS Documentation Index

🚀 **Live Link**: [https://protech.dhruvish.in](https://protech.dhruvish.in)

Welcome to the central documentation index for the ProTech LMS workspace. This document lists the menu of available documentation guides and highlights the key architectural details of the project.

---

## 📖 Documentation Menu

| Document                      | Description                                                                       | Target Link                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Project Overview**          | Full system overview, architecture flows, and monorepo structure.                 | [README.md](./README.md)                                                               |
| **System Overview**           | High-level system structure, components, and data flow.                           | [architecture/system-overview.md](./architecture/system-overview.md)                   |
| **Database Design**           | Relational schemas, Drizzle connections, and performance isolation.               | [architecture/database-design.md](./architecture/database-design.md)                   |
| **Authentication & Security** | Better Auth integration, secure session cookies, rate-limiting, and RBAC guards.  | [architecture/auth-and-security.md](./architecture/auth-and-security.md)               |
| **Video Pipeline**            | Transcoding queue architecture, dynamic EC2 sizing, and spot resilience.          | [architecture/video-pipeline.md](./architecture/video-pipeline.md)                     |
| **Payments & Enrollments**    | Razorpay gateway order flows, guest checkout, verification, and refunds.          | [architecture/payments-and-enrollments.md](./architecture/payments-and-enrollments.md) |
| **Frontend Patterns**         | TanStack Router, React Query custom hooks, headless forms, and custom components. | [architecture/frontend-patterns.md](./architecture/frontend-patterns.md)               |

---

## 🛠️ Project Core Specifications Summary

### 💻 Tech Stack

- **Monorepo Engine**: Bun Workspaces + Turborepo.
- **Web Frontend**: React 19, Vite, Tailwind CSS v4, TanStack Router, TanStack Query, TanStack Form, Radix/Shadcn, Motion, Lucide, Lexical, DnD Kit.
- **API Edge Server**: Hono running on Cloudflare Workers.
- **Video Processing**: Node.js workers, FFmpeg, AWS Lambdas, SQS FIFO, EventBridge, EC2 Spot instances.
- **DB ORM & Client**: Drizzle ORM + Neon HTTP driver.
- **Infrastructure**: AWS CDK (TypeScript-based IaC).

### 🗄️ Database Choice

- **Neon Serverless PostgreSQL** database.
- **Drizzle ORM** schemas in [packages/db/src/schema](./packages/db/src/schema).
- **Dual DB isolation model**: A main database for transactional operations and a separate `video_pipeline_state` database for high-frequency video progress reports.

### 🔑 Authentication Strategy

- **Better Auth** with Drizzle adapter.
- **Email & Password** credentials with mandatory verification and reset tokens.
- **HTTP-Only Cookies** with `Secure`, `HttpOnly`, and `SameSite=None` attributes.
- **Rate Limiting** rules enforced for sensitive paths (verification, resets).
- **TanStack Router** routing checks using asynchronous `beforeLoad` authentication guards.

### 🚀 Deployment Strategy

- **Cloudflare Pages** hosting the React Vite SPA.
- **Cloudflare Workers** running the Hono backend server.
- **AWS CDK** deploying the video transcoding resources (SQS, staging S3 buckets, Lambdas, API Gateway, and Auto-Scaling Spot nodes).

### 📦 Storage Strategy

- **Cloudflare R2** for final `.ts` HLS streams, master playlists, and user attachments (zero egress-fee structure).
- **AWS S3** for raw staging uploads (expired in 3 days) and intermediate chunk segments (expired in 7 days).

### 🔒 Security Considerations

- **API Gateway Keys** on Lambda trigger and status endpoints.
- **Least-Privilege IAM Roles** for EC2 workers and Lambda functions.
- **Zod Schema Validation** executing boundaries on both the frontend forms and backend Hono routes.
- **SameSite CORS Control** using validated backend origin verification lists.

### 💰 Cost Optimization Decisions

- **EC2 Spot Compute**: Utilizes Spot nodes (c5.2xlarge) saving up to 90% in transcoding costs.
- **Dynamic Spot Auto-Scaling Math**: Spawns exactly $\lceil \text{Duration} / 3600 \rceil$ nodes to match workload capacity.
- **R2 Egress Avoidance**: Final video streaming is hosted on Cloudflare R2, eliminating playback data transfer costs.
- **Temporary Staging Expiration**: Auto-deletes staging files on S3 to prevent trailing storage costs.
- **Isolated Pipeline DB**: Keeps high-frequency progress callbacks out of the main database to prevent load spikes and pool contention.
