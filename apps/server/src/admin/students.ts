import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { user } from "@oedulms/db/schema/auth";
import { userRoles, studentProfiles } from "@oedulms/db/schema/profiles";
import { courseEnrollments } from "@oedulms/db/schema/enrollments";
import { eq, or, isNull, sql, desc } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const adminStudentsRouter = new Hono<AppVariables>();

// GET /api/admin/students - List all students with details & enrollment counts
adminStudentsRouter.get("/", async (c) => {
  const db = createDb();

  const students = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      banAt: user.banAt,
      banReason: user.banReason,
      bio: studentProfiles.bio,
      phone: studentProfiles.phone,
      country: studentProfiles.country,
      enrollmentsCount: sql<number>`cast(count(${courseEnrollments.id}) as int)`,
    })
    .from(user)
    .leftJoin(userRoles, eq(user.id, userRoles.userId))
    .leftJoin(studentProfiles, eq(user.id, studentProfiles.userId))
    .leftJoin(courseEnrollments, eq(user.id, courseEnrollments.studentId))
    .where(or(isNull(userRoles.role), eq(userRoles.role, "STUDENT")))
    .groupBy(
      user.id,
      user.name,
      user.email,
      user.image,
      user.createdAt,
      user.banAt,
      user.banReason,
      studentProfiles.id,
      studentProfiles.bio,
      studentProfiles.phone,
      studentProfiles.country
    )
    .orderBy(desc(user.createdAt));

  return c.json(students);
});

// POST /api/admin/students/:id/ban - Ban a student
adminStudentsRouter.post("/:id/ban", async (c) => {
  const id = c.req.param("id");
  const { reason } = await c.req.json().catch(() => ({ reason: undefined }));
  const db = createDb();

  const [updatedUser] = await db
    .update(user)
    .set({
      banAt: new Date(),
      banReason: reason || "Suspended by administrator",
    })
    .where(eq(user.id, id))
    .returning();

  if (!updatedUser) {
    return c.json({ error: "Student not found" }, 404);
  }

  return c.json({ success: true, user: updatedUser });
});

// POST /api/admin/students/:id/unban - Unban a student
adminStudentsRouter.post("/:id/unban", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  const [updatedUser] = await db
    .update(user)
    .set({
      banAt: null,
      banReason: null,
    })
    .where(eq(user.id, id))
    .returning();

  if (!updatedUser) {
    return c.json({ error: "Student not found" }, 404);
  }

  return c.json({ success: true, user: updatedUser });
});
