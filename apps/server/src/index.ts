import { createAuth } from "@oedulms/auth";
import { createDb } from "@oedulms/db";
import { userRoles } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getCookie } from "hono/cookie";

import type { AppVariables, SessionUser } from "./types";
import { apiRouter } from "./router";
import { CACHE_KEYS } from "./utils/cache-keys";
import { cacheService } from "./utils/cache";
import { rateLimiter } from "./middleware/rate-limit";

initLogger({
  env: { service: "oedulms-server" },
});

const app = new Hono<AppVariables>();

// Global IP-based rate limiting (max 120 requests per 60 seconds)
app.use("*", rateLimiter({ limit: 120, windowSeconds: 60 }));

// Logging middleware
app.use(evlog());

// Secure Headers
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*"],
      mediaSrc: ["'self'", "https://*"],
      connectSrc: ["'self'", "https://*"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://*.youtube.com"],
    },
  })
);

// CORS
app.use("/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Identify user for logging (does not block requests)
app.use("*", async (c, next) => {
  const identifyUser = createAuthMiddleware(
    createAuth(c.env as unknown as Record<string, unknown>) as BetterAuthInstance,
    {
      exclude: ["/api/auth/**"],
      maskEmail: true,
    }
  );
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

// Public auth routes (Better Auth)
app.on(["POST", "GET"], "/api/auth/*", (c) =>
  createAuth(c.env as unknown as Record<string, unknown>).handler(c.req.raw)
);

// Public /api/me route (used by the frontend to get the current session)
app.get("/api/me", async (c) => {
  const sessionToken = getCookie(c, "better-auth.session_token");
  const cacheKey = sessionToken ? CACHE_KEYS.USER_SESSION(sessionToken) : "";

  const cached = cacheKey
    ? await cacheService.get<{ user: SessionUser; role: string }>(c, cacheKey)
    : null;

  if (cached) {
    return c.json(cached);
  }

  const auth = createAuth(c.env as unknown as Record<string, unknown>);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ user: null, role: null }, 401);
  }

  const db = createDb();
  const roleRecord = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
    .limit(1);

  const role = roleRecord[0]?.role ?? "STUDENT";
  const responseData = { user: session.user, role };

  if (cacheKey) {
    await cacheService.set(c, cacheKey, responseData, 30); // Cache for 30 seconds
  }

  return c.json(responseData);
});

// All protected API routes — auth guard applied once inside apiRouter
app.route("/api", apiRouter);

app.get("/", (c) => c.text("OK"));

export default app;
