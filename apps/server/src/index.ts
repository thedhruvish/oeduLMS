import { createAuth } from "@oedulms/auth";
import { createDb } from "@oedulms/db";
import { userRoles } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { AppVariables } from "./types";
import { apiRouter } from "./router";

initLogger({
  env: { service: "oedulms-server" },
});

const app = new Hono<AppVariables>();

// Logging middleware
app.use(evlog());



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
  const identifyUser = createAuthMiddleware(createAuth() as BetterAuthInstance, {
    exclude: ["/api/auth/**"],
    maskEmail: true,
  });
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

// Public auth routes (Better Auth)
app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

// Public /api/me route (used by the frontend to get the current session)
app.get("/api/me", async (c) => {
  const auth = createAuth();
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

  return c.json({ user: session.user, role });
});

// All protected API routes — auth guard applied once inside apiRouter
app.route("/api", apiRouter);

app.get("/", (c) => c.text("OK"));

export default app;
