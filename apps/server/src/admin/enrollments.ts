import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { and, eq, desc } from "@oedulms/db/dzl";
import { zValidator } from "@hono/zod-validator";

import { courseEnrollments } from "@oedulms/db/schema/enrollments";
import { courses } from "@oedulms/db/schema/courses";
import { user } from "@oedulms/db/schema/auth";
import { enrollmentSchema } from "@oedulms/validator";
import type { AppVariables } from "../types";

export const enrollmentsRouter = new Hono<AppVariables>()
  .get("/", async (c) => {
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
          thumbnail: courses.thumbnail,
        },
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(user, eq(courseEnrollments.studentId, user.id))
      .orderBy(desc(courseEnrollments.createdAt));

    return c.json(list);
  })
  .post("/", zValidator("json", enrollmentSchema), async (c) => {
    const body = c.req.valid("json");
    const db = createDb();

    // Check if enrollment already exists
    const [existing] = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, body.courseId),
          eq(courseEnrollments.studentId, body.studentId)
        )
      )
      .limit(1);

    if (existing) {
      return c.json({ error: "Student is already enrolled in this course." }, 400);
    }

    const [inserted] = await db
      .insert(courseEnrollments)
      .values({
        courseId: body.courseId,
        studentId: body.studentId,
        status: body.status,
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to create enrollment");
    }

    // Fetch the full inserted enrollment with joined data for the client response
    const [fullEnrollment] = await db
      .select({
        id: courseEnrollments.id,
        progress: courseEnrollments.progress,
        status: courseEnrollments.status,
        createdAt: courseEnrollments.createdAt,
        course: {
          id: courses.id,
          title: courses.title,
          thumbnail: courses.thumbnail,
        },
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(user, eq(courseEnrollments.studentId, user.id))
      .where(eq(courseEnrollments.id, inserted.id))
      .limit(1);

    return c.json(fullEnrollment);
  })
  .put("/:id", zValidator("json", enrollmentSchema.pick({ status: true })), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = createDb();

    const [updated] = await db
      .update(courseEnrollments)
      .set({
        status: body.status,
      })
      .where(eq(courseEnrollments.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Enrollment not found." }, 404);
    }

    // Fetch full updated enrollment
    const [fullEnrollment] = await db
      .select({
        id: courseEnrollments.id,
        progress: courseEnrollments.progress,
        status: courseEnrollments.status,
        createdAt: courseEnrollments.createdAt,
        course: {
          id: courses.id,
          title: courses.title,
          thumbnail: courses.thumbnail,
        },
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(user, eq(courseEnrollments.studentId, user.id))
      .where(eq(courseEnrollments.id, id))
      .limit(1);

    return c.json(fullEnrollment);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const db = createDb();

    const [deleted] = await db
      .delete(courseEnrollments)
      .where(eq(courseEnrollments.id, id))
      .returning();

    if (!deleted) {
      return c.json({ error: "Enrollment not found." }, 404);
    }

    return c.json(deleted);
  });
