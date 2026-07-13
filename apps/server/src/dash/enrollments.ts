import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { courses } from "@oedulms/db/schema/courses";
import { courseEnrollments } from "@oedulms/db/schema/enrollments";
import { eq, and } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const dashEnrollmentsRouter = new Hono<AppVariables>();

dashEnrollmentsRouter.get("/:courseId/check", async (c) => {
  try {
    const courseId = c.req.param("courseId");
    const user = c.get("sessionUser");
    if (!user) {
      return c.json({ isEnrolled: false });
    }

    const db = createDb();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);

    const courseRecord = await db.query.courses.findFirst({
      where: isUuid ? eq(courses.id, courseId) : eq(courses.slug, courseId),
    });

    if (!courseRecord) {
      return c.json({ error: "Course not found" }, 404);
    }

    const enrollment = await db.query.courseEnrollments.findFirst({
      where: and(
        eq(courseEnrollments.courseId, courseRecord.id),
        eq(courseEnrollments.studentId, user.id),
        eq(courseEnrollments.status, "active")
      ),
    });

    let isEnrolled = false;
    if (enrollment) {
      const now = new Date();
      const isExpired = enrollment.expiredAt !== null && new Date(enrollment.expiredAt) < now;
      if (!isExpired) {
        isEnrolled = true;
      }
    }

    return c.json({ isEnrolled });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to check enrollment status";
    console.error("Check enrollment error:", msg);
    return c.json({ error: msg }, 500);
  }
});
