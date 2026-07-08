import { createAuth } from "@oedulms/auth";
import { createDb } from "@oedulms/db";
import { userRoles } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

initLogger({
  env: { service: "oedulms-server" },
});

const app = new Hono<EvlogVariables>();

app.use(evlog());
app.use("*", async (c, next) => {
  const identifyUser = createAuthMiddleware(createAuth() as BetterAuthInstance, {
    exclude: ["/api/auth/**"],
    maskEmail: true,
  });
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

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

  const firstRole = roleRecord[0];
  const role = firstRole ? firstRole.role : "STUDENT";

  return c.json({
    user: session.user,
    role: role,
  });
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
