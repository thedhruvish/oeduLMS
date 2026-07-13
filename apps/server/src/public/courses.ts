import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { courses } from "@oedulms/db/schema/courses";
import { instructorProfiles } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const publicCoursesRouter = new Hono<AppVariables>();

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

// Helper to find a published course ID by either ID or slug
async function resolveCourseId(
  db: ReturnType<typeof createDb>,
  idOrSlug: string
): Promise<string | null> {
  const isUuid = isValidUuid(idOrSlug);
  const record = await db.query.courses.findFirst({
    where: isUuid ? eq(courses.id, idOrSlug) : eq(courses.slug, idOrSlug),
    columns: {
      id: true,
      status: true,
    },
  });

  if (!record || record.status !== "PUBLISHED") {
    return null;
  }
  return record.id;
}

// 1. GET / — List all published courses
publicCoursesRouter.get("/", async (c) => {
  try {
    const db = createDb();
    const publishedCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        shortDescription: courses.shortDescription,
        thumbnail: courses.thumbnail,
        price: courses.price,
        discountPrice: courses.discountPrice,
        durationSeconds: courses.durationSeconds,
        instructorName: instructorProfiles.displayName,
      })
      .from(courses)
      .leftJoin(instructorProfiles, eq(courses.instructorId, instructorProfiles.id))
      .where(eq(courses.status, "PUBLISHED"));

    return c.json(publishedCourses);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch courses";
    return c.json({ error: message }, 500);
  }
});

// 2. GET /:idOrSlug — Get basic course details
publicCoursesRouter.get("/:idOrSlug", async (c) => {
  try {
    const idOrSlug = c.req.param("idOrSlug");
    if (!idOrSlug) {
      return c.json({ error: "Course identifier is required" }, 400);
    }

    const db = createDb();
    const isUuid = isValidUuid(idOrSlug);

    const courseRecord = await db.query.courses.findFirst({
      where: isUuid ? eq(courses.id, idOrSlug) : eq(courses.slug, idOrSlug),
      with: {
        instructorProfile: {
          columns: {
            displayName: true,
          },
        },
      },
    });

    if (!courseRecord || courseRecord.status !== "PUBLISHED") {
      return c.json({ error: "Course not found or not published" }, 404);
    }

    return c.json({
      id: courseRecord.id,
      title: courseRecord.title,
      slug: courseRecord.slug,
      shortDescription: courseRecord.shortDescription,
      description: courseRecord.description,
      thumbnail: courseRecord.thumbnail,
      trailerVideo: courseRecord.trailerVideo,
      price: courseRecord.price,
      discountPrice: courseRecord.discountPrice,
      durationSeconds: courseRecord.durationSeconds,
      instructorName: courseRecord.instructorProfile?.displayName || "ProTech Faculty",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch course details";
    return c.json({ error: message }, 500);
  }
});

// 3. GET /:idOrSlug/curriculum — Get course curriculum (sections & lectures)
publicCoursesRouter.get("/:idOrSlug/curriculum", async (c) => {
  try {
    const idOrSlug = c.req.param("idOrSlug");
    if (!idOrSlug) {
      return c.json({ error: "Course identifier is required" }, 400);
    }

    const db = createDb();
    const courseId = await resolveCourseId(db, idOrSlug);
    if (!courseId) {
      return c.json({ error: "Course not found or not published" }, 404);
    }

    const courseRecord = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
        sections: {
          where: (sections, { and, isNotNull, lte }) =>
            and(isNotNull(sections.publishedAt), lte(sections.publishedAt, new Date())),
          orderBy: (sections, { asc }) => [asc(sections.position)],
          with: {
            lectures: {
              where: (lectures, { and, isNotNull, lte }) =>
                and(isNotNull(lectures.publishedAt), lte(lectures.publishedAt, new Date())),
              orderBy: (lectures, { asc }) => [asc(lectures.position)],
              columns: {
                id: true,
                title: true,
                slug: true,
                duration: true,
                isPreview: true,
                videoUrl: true,
              },
            },
          },
        },
      },
    });

    return c.json(courseRecord?.sections || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch curriculum";
    return c.json({ error: message }, 500);
  }
});

// 4. GET /:idOrSlug/faqs — Get course FAQs
publicCoursesRouter.get("/:idOrSlug/faqs", async (c) => {
  try {
    const idOrSlug = c.req.param("idOrSlug");
    if (!idOrSlug) {
      return c.json({ error: "Course identifier is required" }, 400);
    }

    const db = createDb();
    const courseId = await resolveCourseId(db, idOrSlug);
    if (!courseId) {
      return c.json({ error: "Course not found or not published" }, 404);
    }

    const courseRecord = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
        faqs: {
          orderBy: (faqs, { asc }) => [asc(faqs.position)],
        },
      },
    });

    return c.json(courseRecord?.faqs || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch FAQs";
    return c.json({ error: message }, 500);
  }
});
