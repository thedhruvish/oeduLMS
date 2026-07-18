import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { courses, courseFaqs } from "@oedulms/db/schema/courses";
import { instructorProfiles } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import { zValidator } from "@hono/zod-validator";
import { courseSchema } from "@oedulms/validator";
import type { AppVariables } from "../types";
import { slugify } from "@/utils/slugify";
import { CACHE_KEYS } from "@/utils/cache-keys";
import { cacheService } from "@/utils/cache";

export const adminCoursesRouter = new Hono<AppVariables>();

/**
 * Resolve (or auto-create) instructor profile ID from the auth user ID.
 * Only used when creating a course to assign ownership.
 */
async function resolveInstructorId(userId: string, displayName: string): Promise<string> {
  const db = createDb();
  const existing = await db
    .select({ id: instructorProfiles.id })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const slug = `${slugify(displayName)}-${userId.slice(0, 8)}`;
  const created = await db
    .insert(instructorProfiles)
    .values({ userId, slug, displayName })
    .returning({ id: instructorProfiles.id });

  if (!created[0]) {
    throw new Error("Failed to create instructor profile");
  }

  return created[0].id;
}

async function generateSlug(title: string, excludeId?: string): Promise<string> {
  const db = createDb();
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);
    if (existing.length === 0 || existing[0]?.id === excludeId) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// 1. GET / — List ALL courses (single teacher, no filter needed)
adminCoursesRouter.get("/", async (c) => {
  const db = createDb();
  const allCourses = await db.select().from(courses);
  return c.json(allCourses);
});

// 2. GET /:id — Get single course with its FAQs
adminCoursesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  const [courseList, faqs] = await Promise.all([
    db.select().from(courses).where(eq(courses.id, id)).limit(1),
    db.select().from(courseFaqs).where(eq(courseFaqs.courseId, id)),
  ]);

  if (courseList.length === 0) {
    return c.json({ error: "Course not found" }, 404);
  }

  return c.json({ ...courseList[0], faqs });
});

// 3. POST / — Create course + FAQs in one request
adminCoursesRouter.post("/", zValidator("json", courseSchema), async (c) => {
  const user = c.get("sessionUser");
  const body = c.req.valid("json");
  const instructorId = await resolveInstructorId(user.id, user.name);

  const db = createDb();
  const slug = await generateSlug(body.title);

  const [newCourse] = await db
    .insert(courses)
    .values({
      instructorId,
      title: body.title,
      slug,
      shortDescription: body.shortDescription || null,
      description: body.description || null,
      price: Math.round(body.price * 100),
      discountPrice: body.discountPrice ? Math.round(body.discountPrice * 100) : null,
      currency: body.currency,
      thumbnail: body.thumbnail || null,
      trailerVideo: body.trailerVideo || null,
      durationSeconds: body.durationSeconds,
      totalLectures: body.totalLectures,
      certificateEnabled: body.certificateEnabled,
      status: body.status,
      language: body.language || null,
      validateDays: body.validateDays || null,
    })
    .returning();

  if (!newCourse) {
    throw new Error("Failed to create course");
  }

  // Insert FAQs if provided
  let insertedFaqs: (typeof courseFaqs.$inferSelect)[] = [];
  if (body.faqs && body.faqs.length > 0) {
    insertedFaqs = await db
      .insert(courseFaqs)
      .values(
        body.faqs.map((faq, i) => ({
          courseId: newCourse.id,
          question: faq.question,
          answer: faq.answer,
          position: i,
        }))
      )
      .returning();
  }

  await cacheService.delete(c, CACHE_KEYS.PUBLIC_COURSES);

  return c.json({ ...newCourse, faqs: insertedFaqs }, 201);
});

// 4. PUT /:id — Update course + replace FAQs
adminCoursesRouter.put("/:id", zValidator("json", courseSchema.partial()), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = createDb();

  const existing = await db.select().from(courses).where(eq(courses.id, id)).limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Course not found" }, 404);
  }

  const updateValues: Record<string, unknown> = {};

  if (body.title !== undefined) {
    updateValues.title = body.title;
    updateValues.slug = await generateSlug(body.title, id);
  }
  if (body.shortDescription !== undefined) updateValues.shortDescription = body.shortDescription;
  if (body.description !== undefined) updateValues.description = body.description;
  if (body.price !== undefined) updateValues.price = Math.round(body.price * 100);
  if (body.discountPrice !== undefined)
    updateValues.discountPrice = body.discountPrice ? Math.round(body.discountPrice * 100) : null;
  if (body.currency !== undefined) updateValues.currency = body.currency;
  if (body.thumbnail !== undefined) updateValues.thumbnail = body.thumbnail || null;
  if (body.trailerVideo !== undefined) updateValues.trailerVideo = body.trailerVideo || null;
  if (body.durationSeconds !== undefined) updateValues.durationSeconds = body.durationSeconds;
  if (body.totalLectures !== undefined) updateValues.totalLectures = body.totalLectures;
  if (body.certificateEnabled !== undefined)
    updateValues.certificateEnabled = body.certificateEnabled;
  if (body.status !== undefined) updateValues.status = body.status;
  if (body.language !== undefined) updateValues.language = body.language;
  if (body.validateDays !== undefined) updateValues.validateDays = body.validateDays;

  const [updated] = await db
    .update(courses)
    .set(updateValues)
    .where(eq(courses.id, id))
    .returning();

  // Replace FAQs if provided — delete old, insert new
  let updatedFaqs: (typeof courseFaqs.$inferSelect)[] = [];
  if (body.faqs !== undefined) {
    await db.delete(courseFaqs).where(eq(courseFaqs.courseId, id));

    if (body.faqs.length > 0) {
      updatedFaqs = await db
        .insert(courseFaqs)
        .values(
          body.faqs.map((faq, i) => ({
            courseId: id,
            question: faq.question,
            answer: faq.answer,
            position: i,
          }))
        )
        .returning();
    }
  } else {
    updatedFaqs = await db.select().from(courseFaqs).where(eq(courseFaqs.courseId, id));
  }

  await cacheService.delete(c, CACHE_KEYS.PUBLIC_COURSES);

  return c.json({ ...updated, faqs: updatedFaqs });
});

// 5. DELETE /:id — Delete course (FAQs cascade via DB)
adminCoursesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  const existing = await db.select().from(courses).where(eq(courses.id, id)).limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Course not found" }, 404);
  }

  await db.delete(courses).where(eq(courses.id, id));
  await cacheService.delete(c, CACHE_KEYS.PUBLIC_COURSES);
  return c.json({ message: "Course deleted successfully" });
});
