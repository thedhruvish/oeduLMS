import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { user } from "@oedulms/db/schema/auth";
import { userRoles } from "@oedulms/db/schema/profiles";
import { courses } from "@oedulms/db/schema/courses";
import { payments } from "@oedulms/db/schema/payments";
import { eq, or, isNull, sql, inArray } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const adminDashboardRouter = new Hono<AppVariables>();

adminDashboardRouter.get("/stats", async (c) => {
  const db = createDb();

  try {
    // Run independent stats queries concurrently
    const [activeCoursesResult, totalStudentsResult, totalEarningsResult] = await Promise.all([
      db
        .select({ count: sql<number>`cast(count(${courses.id}) as int)` })
        .from(courses)
        .where(eq(courses.status, "PUBLISHED")),
      db
        .select({ count: sql<number>`cast(count(${user.id}) as int)` })
        .from(user)
        .leftJoin(userRoles, eq(user.id, userRoles.userId))
        .where(or(isNull(userRoles.role), eq(userRoles.role, "STUDENT"))),
      db
        .select({ sum: sql<number>`cast(sum(${payments.amount}) as int)` })
        .from(payments)
        .where(inArray(payments.status, ["verified", "completed"])),
    ]);

    const activeCourses = activeCoursesResult[0]?.count ?? 0;
    const totalStudents = totalStudentsResult[0]?.count ?? 0;
    const totalEarningsCents = totalEarningsResult[0]?.sum ?? 0;
    const totalEarnings = totalEarningsCents / 100;

    return c.json({
      activeCourses,
      totalStudents,
      totalEarnings,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});
