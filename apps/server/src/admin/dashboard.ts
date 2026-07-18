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
    // 1. Count active courses (published status)
    const activeCoursesResult = await db
      .select({ count: sql<number>`cast(count(${courses.id}) as int)` })
      .from(courses)
      .where(eq(courses.status, "PUBLISHED"));
    const activeCourses = activeCoursesResult[0]?.count ?? 0;

    // 2. Count total students (role is STUDENT or null)
    const totalStudentsResult = await db
      .select({ count: sql<number>`cast(count(${user.id}) as int)` })
      .from(user)
      .leftJoin(userRoles, eq(user.id, userRoles.userId))
      .where(or(isNull(userRoles.role), eq(userRoles.role, "STUDENT")));
    const totalStudents = totalStudentsResult[0]?.count ?? 0;

    // 3. Calculate total earnings (status is verified or completed)
    const totalEarningsResult = await db
      .select({ sum: sql<number>`cast(sum(${payments.amount}) as int)` })
      .from(payments)
      .where(inArray(payments.status, ["verified", "completed"]));
    const totalEarningsCents = totalEarningsResult[0]?.sum ?? 0;
    const totalEarnings = totalEarningsCents / 100; // Convert cents to standard currency units

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
