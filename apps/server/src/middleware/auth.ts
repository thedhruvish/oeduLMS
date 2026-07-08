import { createMiddleware } from "hono/factory";
import { createAuth } from "@oedulms/auth";
import { createDb } from "@oedulms/db";
import { userRoles } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

/**
 * Shared auth guard middleware.
 * Verifies the request has a valid session and stores sessionUser + userRole in context.
 * Returns 401 if not authenticated.
 */
export const authGuard = createMiddleware<AppVariables>(async (c, next) => {
  const auth = createAuth();
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb();
  const roleRecord = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
    .limit(1);

  const role = roleRecord[0]?.role ?? "STUDENT";

  c.set("sessionUser", session.user as AppVariables["Variables"]["sessionUser"]);
  c.set("userRole", role);

  await next();
});

/**
 * Teacher-only guard. Must be used after authGuard.
 * Returns 403 if the authenticated user is not a TEACHER.
 */
export const teacherGuard = createMiddleware<AppVariables>(async (c, next) => {
  const role = c.get("userRole");
  if (role !== "TEACHER") {
    return c.json({ error: "Forbidden: Teacher access required" }, 403);
  }
  await next();
});
