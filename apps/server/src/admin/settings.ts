import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { systemSettings } from "@oedulms/db/schema/profiles";
import { session } from "@oedulms/db/schema/auth";
import { eq, and } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";
import { CACHE_KEYS } from "../utils/cache-keys";
import { cacheService } from "../utils/cache";

export const adminSettingsRouter = new Hono<AppVariables>();

adminSettingsRouter.get("/", async (c) => {
  try {
    const db = createDb();
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "allow_student_posts"),
    });

    return c.json({
      allowStudentPosts: setting ? setting.value === "true" : true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch settings";
    return c.json({ error: msg }, 500);
  }
});

adminSettingsRouter.post("/", async (c) => {
  try {
    const { allowStudentPosts } = await c.req.json<{ allowStudentPosts: boolean }>();
    const db = createDb();

    await db
      .insert(systemSettings)
      .values({
        key: "allow_student_posts",
        value: allowStudentPosts ? "true" : "false",
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: allowStudentPosts ? "true" : "false",
          updatedAt: new Date(),
        },
      });

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update settings";
    return c.json({ error: msg }, 500);
  }
});

// GET /api/admin/settings/sessions — List active sessions for logged-in user
adminSettingsRouter.get("/sessions", async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const db = createDb();
    const activeSessions = await db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt,
      })
      .from(session)
      .where(eq(session.userId, sessionUser.id));

    const currentIp =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("x-real-ip") ||
      c.req.header("x-forwarded-for") ||
      null;
    const currentCity = c.req.header("cf-ipcity") || null;
    const currentCountry = c.req.header("cf-ipcountry") || null;

    return c.json({
      sessions: activeSessions,
      currentLocation: {
        ip: currentIp,
        city: currentCity,
        country: currentCountry,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch sessions";
    return c.json({ error: msg }, 500);
  }
});

// POST /api/admin/settings/sessions/revoke — Log out of a specific device/session
adminSettingsRouter.post("/sessions/revoke", async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { id } = await c.req.json<{ id: string }>();
    if (!id) {
      return c.json({ error: "Missing session ID" }, 400);
    }

    const db = createDb();

    // Fetch the session token to invalidate its cached user session
    const sessionToRevoke = await db
      .select({ token: session.token })
      .from(session)
      .where(and(eq(session.id, id), eq(session.userId, sessionUser.id)))
      .limit(1);

    if (sessionToRevoke[0]) {
      const cacheKey = CACHE_KEYS.USER_SESSION(sessionToRevoke[0].token);
      await cacheService.delete(c, cacheKey);
    }

    await db.delete(session).where(and(eq(session.id, id), eq(session.userId, sessionUser.id)));

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to revoke session";
    return c.json({ error: msg }, 500);
  }
});
