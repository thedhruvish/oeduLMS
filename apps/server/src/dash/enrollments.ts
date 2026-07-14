import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { courses } from "@oedulms/db/schema/courses";
import { courseEnrollments } from "@oedulms/db/schema/enrollments";
import { eq, and, desc } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const dashEnrollmentsRouter = new Hono<AppVariables>();

dashEnrollmentsRouter.get("/", async (c) => {
  try {
    const user = c.get("sessionUser");

    const db = createDb();
    const list = await db
      .select({
        id: courseEnrollments.id,
        progress: courseEnrollments.progress,
        status: courseEnrollments.status,
        createdAt: courseEnrollments.createdAt,
        course: {
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          thumbnail: courses.thumbnail,
          shortDescription: courses.shortDescription,
          durationSeconds: courses.durationSeconds,
        },
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(and(eq(courseEnrollments.studentId, user.id), eq(courseEnrollments.status, "active")))
      .orderBy(desc(courseEnrollments.createdAt));

    return c.json(list);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch enrollments";
    return c.json({ error: msg }, 500);
  }
});

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
