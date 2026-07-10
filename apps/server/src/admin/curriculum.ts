import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "@oedulms/db";
import { courseSections, courseLectures, lectureResources } from "@oedulms/db/schema/courses";
import { eq, asc, desc } from "@oedulms/db/dzl";
import { zValidator } from "@hono/zod-validator";
import { sectionSchema, lectureSchema } from "@oedulms/validator";
import type { AppVariables } from "../types";
import { slugify } from "@/utils/slugify";

export const adminCurriculumRouter = new Hono<AppVariables>();

// 1. GET /:courseId/sections — Fetch all sections and nested lectures
adminCurriculumRouter.get("/:courseId/sections", async (c) => {
  const courseId = c.req.param("courseId");
  const db = createDb();

  try {
    const sectionsList = await db
      .select()
      .from(courseSections)
      .where(eq(courseSections.courseId, courseId))
      .orderBy(asc(courseSections.position));

    const result = [];

    for (const section of sectionsList) {
      const lecturesList = await db
        .select()
        .from(courseLectures)
        .where(eq(courseLectures.sectionId, section.id))
        .orderBy(asc(courseLectures.position));

      const lecturesWithResources = [];
      for (const lecture of lecturesList) {
        const resources = await db
          .select()
          .from(lectureResources)
          .where(eq(lectureResources.lectureId, lecture.id));
        lecturesWithResources.push({
          ...lecture,
          resources,
        });
      }

      result.push({
        ...section,
        lectures: lecturesWithResources,
      });
    }

    return c.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch curriculum";
    return c.json({ error: msg }, 500);
  }
});

// 2. POST /:courseId/sections — Create a new section
adminCurriculumRouter.post("/:courseId/sections", zValidator("json", sectionSchema), async (c) => {
  const courseId = c.req.param("courseId");
  const { title, description, publishMode, publishedAt } = c.req.valid("json");
  const db = createDb();

  try {
    // Calculate position: max(position) + 1
    const existing = await db
      .select()
      .from(courseSections)
      .where(eq(courseSections.courseId, courseId))
      .orderBy(desc(courseSections.position))
      .limit(1);

    const position = existing[0] ? existing[0].position + 1 : 0;

    const [newSection] = await db
      .insert(courseSections)
      .values({
        courseId,
        title,
        description: description || null,
        position,
        publishMode: publishMode || "AFTER_TRANSCODE",
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      })
      .returning();

    return c.json({ ...newSection, lectures: [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create section";
    return c.json({ error: msg }, 500);
  }
});

// 2b. PUT /:courseId/sections/reorder — Batch reorder sections
adminCurriculumRouter.put(
  "/:courseId/sections/reorder",
  zValidator(
    "json",
    z.object({
      orders: z.array(
        z.object({
          id: z.string().uuid(),
          position: z.number().int().min(0),
        })
      ),
    })
  ),
  async (c) => {
    const { orders } = c.req.valid("json");
    const db = createDb();

    try {
      for (const order of orders) {
        await db
          .update(courseSections)
          .set({ position: order.position })
          .where(eq(courseSections.id, order.id));
      }
      return c.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder sections";
      return c.json({ error: msg }, 500);
    }
  }
);
adminCurriculumRouter.put(
  "/:courseId/sections/:id",
  zValidator("json", sectionSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const updateData = c.req.valid("json");
    const db = createDb();

    try {
      const { title, description, publishMode, publishedAt } = updateData;
      const updateFields: Partial<typeof courseSections.$inferInsert> = {
        title,
        publishMode,
      };
      if (description !== undefined) {
        updateFields.description = description || null;
      }
      if (publishedAt !== undefined) {
        updateFields.publishedAt = publishedAt ? new Date(publishedAt) : null;
      }

      const [updatedSection] = await db
        .update(courseSections)
        .set(updateFields)
        .where(eq(courseSections.id, id))
        .returning();

      if (!updatedSection) {
        return c.json({ error: "Section not found" }, 404);
      }

      return c.json(updatedSection);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update section";
      return c.json({ error: msg }, 500);
    }
  }
);

// 4. DELETE /:courseId/sections/:id — Delete section (cascades lectures)
adminCurriculumRouter.delete("/:courseId/sections/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  try {
    const [deletedSection] = await db
      .delete(courseSections)
      .where(eq(courseSections.id, id))
      .returning();

    if (!deletedSection) {
      return c.json({ error: "Section not found" }, 404);
    }

    return c.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete section";
    return c.json({ error: msg }, 500);
  }
});

// 5. POST /:courseId/sections/:sectionId/lectures — Create a lecture
adminCurriculumRouter.post(
  "/:courseId/sections/:sectionId/lectures",
  zValidator("json", lectureSchema),
  async (c) => {
    const sectionId = c.req.param("sectionId");
    const body = c.req.valid("json");
    const db = createDb();

    try {
      // Calculate position
      const existing = await db
        .select()
        .from(courseLectures)
        .where(eq(courseLectures.sectionId, sectionId))
        .orderBy(desc(courseLectures.position))
        .limit(1);

      const position = existing[0] ? existing[0].position + 1 : 0;
      const slug = `${slugify(body.title)}-${crypto.randomUUID().slice(0, 8)}`;

      const [newLecture] = await db
        .insert(courseLectures)
        .values({
          sectionId,
          title: body.title,
          slug,
          description: body.description || null,
          videoUrl: body.videoUrl || null,
          thumbnail: body.thumbnail || null,
          duration: body.duration || 0,
          isPreview: body.isPreview || false,
          publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
          publishMode: body.publishMode || "AFTER_TRANSCODE",
          qualities: body.qualities || [],
          position,
        })
        .returning();

      if (!newLecture) {
        throw new Error("Failed to create lecture");
      }

      // Insert nested resources
      if (body.resources && body.resources.length > 0) {
        for (const res of body.resources) {
          await db.insert(lectureResources).values({
            lectureId: newLecture.id,
            title: res.title,
            type: res.type,
            url: res.url,
            size: res.size || null,
          });
        }
      }

      // Fetch resources to return them
      const resourcesList = await db
        .select()
        .from(lectureResources)
        .where(eq(lectureResources.lectureId, newLecture.id));

      return c.json({ ...newLecture, resources: resourcesList });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create lecture";
      return c.json({ error: msg }, 500);
    }
  }
);

// 5b. PUT /:courseId/sections/:sectionId/lectures/reorder — Batch reorder lectures
adminCurriculumRouter.put(
  "/:courseId/sections/:sectionId/lectures/reorder",
  zValidator(
    "json",
    z.object({
      orders: z.array(
        z.object({
          id: z.string().uuid(),
          position: z.number().int().min(0),
        })
      ),
    })
  ),
  async (c) => {
    const { orders } = c.req.valid("json");
    const db = createDb();

    try {
      for (const order of orders) {
        await db
          .update(courseLectures)
          .set({ position: order.position })
          .where(eq(courseLectures.id, order.id));
      }
      return c.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder lectures";
      return c.json({ error: msg }, 500);
    }
  }
);

// 6. PUT /:courseId/sections/:sectionId/lectures/:id — Update a lecture
adminCurriculumRouter.put(
  "/:courseId/sections/:sectionId/lectures/:id",
  zValidator("json", lectureSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const updateData = c.req.valid("json");
    const db = createDb();

    try {
      const { resources, ...updateFieldsData } = updateData;
      const updateFields: Partial<typeof courseLectures.$inferInsert> = {
        title: updateFieldsData.title,
        description: updateFieldsData.description,
        videoUrl: updateFieldsData.videoUrl,
        thumbnail: updateFieldsData.thumbnail,
        duration: updateFieldsData.duration,
        isPreview: updateFieldsData.isPreview,
        publishMode: updateFieldsData.publishMode,
        qualities: updateFieldsData.qualities,
      };
      if (updateFieldsData.title) {
        updateFields.slug = `${slugify(updateFieldsData.title)}-${crypto.randomUUID().slice(0, 8)}`;
      }
      if (updateFieldsData.publishedAt !== undefined) {
        updateFields.publishedAt = updateFieldsData.publishedAt
          ? new Date(updateFieldsData.publishedAt)
          : null;
      }

      const [updatedLecture] = await db
        .update(courseLectures)
        .set(updateFields)
        .where(eq(courseLectures.id, id))
        .returning();

      if (!updatedLecture) {
        return c.json({ error: "Lecture not found" }, 404);
      }

      // Sync resources if provided
      if (updateData.resources !== undefined) {
        await db.delete(lectureResources).where(eq(lectureResources.lectureId, id));
        if (updateData.resources.length > 0) {
          for (const res of updateData.resources) {
            await db.insert(lectureResources).values({
              lectureId: id,
              title: res.title,
              type: res.type,
              url: res.url,
              size: res.size || null,
            });
          }
        }
      }

      const resourcesList = await db
        .select()
        .from(lectureResources)
        .where(eq(lectureResources.lectureId, id));

      return c.json({ ...updatedLecture, resources: resourcesList });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update lecture";
      return c.json({ error: msg }, 500);
    }
  }
);

// 7. DELETE /:courseId/sections/:sectionId/lectures/:id — Delete a lecture
adminCurriculumRouter.delete("/:courseId/sections/:sectionId/lectures/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb();

  try {
    const [deletedLecture] = await db
      .delete(courseLectures)
      .where(eq(courseLectures.id, id))
      .returning();

    if (!deletedLecture) {
      return c.json({ error: "Lecture not found" }, 404);
    }

    return c.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete lecture";
    return c.json({ error: msg }, 500);
  }
});
