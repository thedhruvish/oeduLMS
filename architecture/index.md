# ProTech LMS Architecture Portal

Welcome to the official architecture documentation portal for the ProTech LMS platform. This documentation is structured to guide developers, system administrators, and architects through the design patterns, storage models, and compute pipelines of the project.

---

## 🗺️ Documentation Menu

Select a module below to view detailed technical specifications and flows:

### 1. [System Overview](./system-overview.md)

- High-level system topology spanning Cloudflare Edge and AWS compute.
- Workspace organization (monorepo apps and packages).
- Data flows between subsystems.

### 2. [Database Design & Schema](./database-design.md)

- Relational schema specification (users, profiles, courses, discussions, payments).
- Dual-database separation pattern (Neon + Drizzle ORM).
- Performance isolation strategies for high-frequency logs.

### 3. [Authentication, Authorization & Security](./auth-and-security.md)

- Session handling mechanism using Better Auth.
- Role-based security rules (TEACHER vs. STUDENT).
- CORS policies, rate limiting, secure cookie flags, and Zod validator boundaries.

### 4. [Serverless Video Pipeline](./video-pipeline.md)

- Event-driven transcoding architecture (AWS API Gateway, SQS FIFO, Lambda).
- Adaptive chunk sizing rules and EC2 Spot scaling logic.
- Resilience patterns (spot warnings, heartbeat, DLQ).

### 5. [Payments, Checkout & Enrollments](./payments-and-enrollments.md)

- Checkout flow integrated with Razorpay gateway.
- Dual-verification flow (client-side vs. asynchronous webhooks).
- Double enrollment prevention and refund handlers.

### 6. [Frontend State & Design Patterns](./frontend-patterns.md)

- Client state management (TanStack Query query key factories).
- Headless forms and validator bindings (TanStack Form + Zod).
- Custom UI extensions (Premium Video Player, dialog systems).
