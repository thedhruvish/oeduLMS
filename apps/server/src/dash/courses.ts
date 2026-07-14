import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { courses, courseSections, courseLectures } from "@oedulms/db/schema/courses";
import { courseEnrollments, lectureProgress } from "@oedulms/db/schema/enrollments";
import {
  lectureComments,
  lectureQuestions,
  lectureQuestionAnswers,
} from "@oedulms/db/schema/discussions";
import { eq, and, asc, desc, isNull, inArray } from "@oedulms/db/dzl";
import { zValidator } from "@hono/zod-validator";
import {
  lectureCommentSchema,
  lectureQuestionSchema,
  lectureAnswerSchema,
  lectureProgressSchema,
} from "@oedulms/validator";
import type { AppVariables } from "../types";

export const dashCoursesRouter = new Hono<AppVariables>();

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

async function resolveCourse(db: ReturnType<typeof createDb>, courseIdOrSlug: string) {
  const isUuid = isValidUuid(courseIdOrSlug);
  return db.query.courses.findFirst({
    where: isUuid ? eq(courses.id, courseIdOrSlug) : eq(courses.slug, courseIdOrSlug),
  });
}

async function requireEnrollment(
  db: ReturnType<typeof createDb>,
  courseId: string,
  studentId: string
) {
  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(
      eq(courseEnrollments.courseId, courseId),
      eq(courseEnrollments.studentId, studentId),
      eq(courseEnrollments.status, "active")
    ),
  });

  if (!enrollment) return null;

  const now = new Date();
  if (enrollment.expiredAt !== null && new Date(enrollment.expiredAt) < now) {
    return null;
  }

  return enrollment;
}

function extractTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "content" in value) {
    const content = (value as { content: unknown }).content;
    if (typeof content === "string") return content;
  }
  return "";
}

// ─── GET /:courseId — Full course player payload ─────────────────────────────
dashCoursesRouter.get("/:courseId", async (c) => {
  try {
    const courseIdParam = c.req.param("courseId");
    const user = c.get("sessionUser");
    const db = createDb();

    const course = await resolveCourse(db, courseIdParam);
    if (!course) {
      return c.json({ error: "Course not found" }, 404);
    }

    const enrollment = await requireEnrollment(db, course.id, user.id);
    if (!enrollment) {
      return c.json({ error: "You are not enrolled in this course" }, 403);
    }

    const now = new Date();
    const sections = await db.query.courseSections.findMany({
      where: and(
        eq(courseSections.courseId, course.id)
        // Include published sections; for enrolled students also allow any with publishedAt set
      ),
      orderBy: [asc(courseSections.position)],
      with: {
        lectures: {
          orderBy: [asc(courseLectures.position)],
          columns: {
            id: true,
            sectionId: true,
            title: true,
            slug: true,
            description: true,
            videoUrl: true,
            thumbnail: true,
            duration: true,
            isPreview: true,
            position: true,
            publishedAt: true,
          },
          with: {
            resources: true,
          },
        },
      },
    });

    // Filter to published content for students
    const publishedSections = sections
      .filter((s) => s.publishedAt && new Date(s.publishedAt) <= now)
      .map((section) => ({
        ...section,
        lectures: section.lectures.filter((l) => l.publishedAt && new Date(l.publishedAt) <= now),
      }))
      .filter((s) => s.lectures.length > 0);

    const allLectureIds = publishedSections.flatMap((s) => s.lectures.map((l) => l.id));

    let progressMap = new Map<
      string,
      { watchSeconds: number; lastPosition: number; completed: boolean }
    >();

    if (allLectureIds.length > 0) {
      const progressRows = await db
        .select()
        .from(lectureProgress)
        .where(
          and(
            eq(lectureProgress.studentId, user.id),
            inArray(lectureProgress.lectureId, allLectureIds)
          )
        );

      progressMap = new Map(
        progressRows.map((p) => [
          p.lectureId,
          {
            watchSeconds: p.watchSeconds,
            lastPosition: p.lastPosition,
            completed: p.completed,
          },
        ])
      );
    }

    const sectionsWithProgress = publishedSections.map((section) => {
      const lectures = section.lectures.map((lecture) => {
        const progress = progressMap.get(lecture.id);
        return {
          id: lecture.id,
          sectionId: lecture.sectionId,
          title: lecture.title,
          slug: lecture.slug,
          description: lecture.description,
          videoUrl: lecture.videoUrl,
          thumbnail: lecture.thumbnail,
          duration: lecture.duration,
          isPreview: lecture.isPreview,
          position: lecture.position,
          resources: lecture.resources.map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            url: r.url,
            size: r.size,
          })),
          progress: {
            watchSeconds: progress?.watchSeconds ?? 0,
            lastPosition: progress?.lastPosition ?? 0,
            completed: progress?.completed ?? false,
          },
        };
      });

      const totalVideos = lectures.length;
      const watchedVideos = lectures.filter((l) => l.progress.completed).length;

      return {
        id: section.id,
        title: section.title,
        description: section.description,
        position: section.position,
        totalVideos,
        watchedVideos,
        lectures,
      };
    });

    const totalLectures = sectionsWithProgress.reduce((acc, s) => acc + s.totalVideos, 0);
    const completedLectures = sectionsWithProgress.reduce((acc, s) => acc + s.watchedVideos, 0);

    return c.json({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail,
        shortDescription: course.shortDescription,
      },
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        status: enrollment.status,
      },
      sections: sectionsWithProgress,
      stats: {
        totalLectures,
        completedLectures,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch course player data";
    console.error("Course player error:", msg);
    return c.json({ error: msg }, 500);
  }
});

// ─── PUT /:courseId/lectures/:lectureId/progress ─────────────────────────────
dashCoursesRouter.put(
  "/:courseId/lectures/:lectureId/progress",
  zValidator("json", lectureProgressSchema),
  async (c) => {
    try {
      const courseIdParam = c.req.param("courseId");
      const lectureId = c.req.param("lectureId");
      const user = c.get("sessionUser");
      const body = c.req.valid("json");
      const db = createDb();

      const course = await resolveCourse(db, courseIdParam);
      if (!course) return c.json({ error: "Course not found" }, 404);

      const enrollment = await requireEnrollment(db, course.id, user.id);
      if (!enrollment) return c.json({ error: "Not enrolled" }, 403);

      const lecture = await db.query.courseLectures.findFirst({
        where: eq(courseLectures.id, lectureId),
        with: { section: true },
      });

      if (!lecture || lecture.section.courseId !== course.id) {
        return c.json({ error: "Lecture not found in this course" }, 404);
      }

      const existing = await db.query.lectureProgress.findFirst({
        where: and(
          eq(lectureProgress.lectureId, lectureId),
          eq(lectureProgress.studentId, user.id)
        ),
      });

      let result;
      if (existing) {
        [result] = await db
          .update(lectureProgress)
          .set({
            watchSeconds: body.watchSeconds ?? existing.watchSeconds,
            lastPosition: body.lastPosition ?? existing.lastPosition,
            completed: body.completed ?? existing.completed,
          })
          .where(eq(lectureProgress.id, existing.id))
          .returning();
      } else {
        [result] = await db
          .insert(lectureProgress)
          .values({
            lectureId,
            studentId: user.id,
            watchSeconds: body.watchSeconds ?? 0,
            lastPosition: body.lastPosition ?? 0,
            completed: body.completed ?? false,
          })
          .returning();
      }

      // Recalculate course progress percentage
      const allSections = await db.query.courseSections.findMany({
        where: eq(courseSections.courseId, course.id),
        with: {
          lectures: {
            columns: { id: true, publishedAt: true },
          },
        },
      });

      const now = new Date();
      const publishedLectureIds = allSections
        .flatMap((s) => s.lectures)
        .filter((l) => l.publishedAt && new Date(l.publishedAt) <= now)
        .map((l) => l.id);

      let completedCount = 0;
      if (publishedLectureIds.length > 0) {
        const completed = await db
          .select()
          .from(lectureProgress)
          .where(
            and(
              eq(lectureProgress.studentId, user.id),
              eq(lectureProgress.completed, true),
              inArray(lectureProgress.lectureId, publishedLectureIds)
            )
          );
        completedCount = completed.length;
      }

      const progressPct =
        publishedLectureIds.length > 0
          ? Math.round((completedCount / publishedLectureIds.length) * 100)
          : 0;

      await db
        .update(courseEnrollments)
        .set({
          progress: progressPct,
          ...(progressPct >= 100 ? { status: "completed", completedAt: new Date() } : {}),
        })
        .where(eq(courseEnrollments.id, enrollment.id));

      return c.json({
        progress: result,
        courseProgress: progressPct,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update progress";
      return c.json({ error: msg }, 500);
    }
  }
);

// ─── GET /:courseId/lectures/:lectureId/comments ─────────────────────────────
dashCoursesRouter.get("/:courseId/lectures/:lectureId/comments", async (c) => {
  try {
    const courseIdParam = c.req.param("courseId");
    const lectureId = c.req.param("lectureId");
    const user = c.get("sessionUser");
    const db = createDb();

    const course = await resolveCourse(db, courseIdParam);
    if (!course) return c.json({ error: "Course not found" }, 404);

    const enrollment = await requireEnrollment(db, course.id, user.id);
    if (!enrollment) return c.json({ error: "Not enrolled" }, 403);

    const comments = await db.query.lectureComments.findMany({
      where: eq(lectureComments.lectureId, lectureId),
      orderBy: [desc(lectureComments.createdAt)],
      with: {
        user: {
          columns: { id: true, name: true, image: true },
        },
      },
    });

    return c.json(
      comments.map((comment) => {
        const isDeleted = comment.deletedAt !== null;
        return {
          id: comment.id,
          content: isDeleted ? "This comment has been deleted" : comment.content,
          parentId: comment.parentId,
          isEdited: comment.isEdited,
          isDeleted,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          user: isDeleted ? { id: "", name: "Deleted User", image: null } : comment.user,
        };
      })
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch comments";
    return c.json({ error: msg }, 500);
  }
});

// ─── POST /:courseId/lectures/:lectureId/comments ────────────────────────────
dashCoursesRouter.post(
  "/:courseId/lectures/:lectureId/comments",
  zValidator("json", lectureCommentSchema),
  async (c) => {
    try {
      const courseIdParam = c.req.param("courseId");
      const lectureId = c.req.param("lectureId");
      const user = c.get("sessionUser");
      const { content, parentId } = c.req.valid("json");
      const db = createDb();

      const course = await resolveCourse(db, courseIdParam);
      if (!course) return c.json({ error: "Course not found" }, 404);

      const enrollment = await requireEnrollment(db, course.id, user.id);
      if (!enrollment) return c.json({ error: "Not enrolled" }, 403);

      const lecture = await db.query.courseLectures.findFirst({
        where: eq(courseLectures.id, lectureId),
        with: { section: true },
      });
      if (!lecture || lecture.section.courseId !== course.id) {
        return c.json({ error: "Lecture not found" }, 404);
      }

      if (parentId) {
        const parent = await db.query.lectureComments.findFirst({
          where: and(
            eq(lectureComments.id, parentId),
            eq(lectureComments.lectureId, lectureId),
            isNull(lectureComments.deletedAt)
          ),
        });
        if (!parent) return c.json({ error: "Parent comment not found" }, 404);
      }

      const [created] = await db
        .insert(lectureComments)
        .values({
          lectureId,
          userId: user.id,
          content,
          parentId: parentId || null,
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to create comment" }, 500);
      }

      return c.json({
        id: created.id,
        content: created.content,
        parentId: created.parentId,
        isEdited: created.isEdited,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          image: user.image ?? null,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create comment";
      return c.json({ error: msg }, 500);
    }
  }
);

// ─── DELETE /:courseId/lectures/:lectureId/comments/:commentId ────────────────
dashCoursesRouter.delete("/:courseId/lectures/:lectureId/comments/:commentId", async (c) => {
  try {
    const courseIdParam = c.req.param("courseId");
    const lectureId = c.req.param("lectureId");
    const commentId = c.req.param("commentId");
    const user = c.get("sessionUser");
    const db = createDb();

    const course = await resolveCourse(db, courseIdParam);
    if (!course) return c.json({ error: "Course not found" }, 404);

    const enrollment = await requireEnrollment(db, course.id, user.id);
    if (!enrollment) return c.json({ error: "Not enrolled" }, 403);

    const comment = await db.query.lectureComments.findFirst({
      where: and(
        eq(lectureComments.id, commentId),
        eq(lectureComments.lectureId, lectureId),
        isNull(lectureComments.deletedAt)
      ),
    });

    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    if (comment.userId !== user.id) {
      return c.json({ error: "Unauthorized to delete this comment" }, 403);
    }

    // Soft delete the comment (and do NOT touch the child replies so they remain visible)
    await db
      .update(lectureComments)
      .set({ deletedAt: new Date() })
      .where(eq(lectureComments.id, commentId));

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete comment";
    return c.json({ error: msg }, 500);
  }
});

// ─── GET /:courseId/lectures/:lectureId/questions ────────────────────────────
dashCoursesRouter.get("/:courseId/lectures/:lectureId/questions", async (c) => {
  try {
    const courseIdParam = c.req.param("courseId");
    const lectureId = c.req.param("lectureId");
    const user = c.get("sessionUser");
    const db = createDb();

    const course = await resolveCourse(db, courseIdParam);
    if (!course) return c.json({ error: "Course not found" }, 404);

    const enrollment = await requireEnrollment(db, course.id, user.id);
    if (!enrollment) return c.json({ error: "Not enrolled" }, 403);

    const questions = await db.query.lectureQuestions.findMany({
      where: and(eq(lectureQuestions.lectureId, lectureId), isNull(lectureQuestions.deletedAt)),
      orderBy: [desc(lectureQuestions.createdAt)],
      with: {
        student: {
          columns: { id: true, name: true, image: true },
        },
        answers: {
          where: (answers, { isNull: isNullCol }) => isNullCol(answers.deletedAt),
          orderBy: [asc(lectureQuestionAnswers.createdAt)],
          with: {
            user: {
              columns: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    return c.json(
      questions.map((q) => ({
        id: q.id,
        title: q.title,
        description: extractTextContent(q.description),
        status: q.status,
        viewsCount: q.viewsCount,
        answersCount: q.answersCount,
        acceptedAnswerId: q.acceptedAnswerId,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        student: q.student,
        answers: q.answers.map((a) => ({
          id: a.id,
          content: extractTextContent(a.content),
          isInstructorAnswer: a.isInstructorAnswer,
          isAccepted: a.isAccepted,
          upvotes: a.upvotes,
          createdAt: a.createdAt,
          user: a.user,
        })),
      }))
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch questions";
    return c.json({ error: msg }, 500);
  }
});

// ─── POST /:courseId/lectures/:lectureId/questions ───────────────────────────
dashCoursesRouter.post(
  "/:courseId/lectures/:lectureId/questions",
  zValidator("json", lectureQuestionSchema),
  async (c) => {
    try {
      const courseIdParam = c.req.param("courseId");
      const lectureId = c.req.param("lectureId");
      const user = c.get("sessionUser");
      const { title, description } = c.req.valid("json");
      const db = createDb();

      const course = await resolveCourse(db, courseIdParam);
      if (!course) return c.json({ error: "Course not found" }, 404);

      const enrollment = await requireEnrollment(db, course.id, user.id);
      if (!enrollment) return c.json({ error: "Not enrolled" }, 403);

      const lecture = await db.query.courseLectures.findFirst({
        where: eq(courseLectures.id, lectureId),
        with: { section: true },
      });
      if (!lecture || lecture.section.courseId !== course.id) {
        return c.json({ error: "Lecture not found" }, 404);
      }

      const [created] = await db
        .insert(lectureQuestions)
        .values({
          lectureId,
          studentId: user.id,
          title,
          description: { content: description },
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to create question" }, 500);
      }

      return c.json({
        id: created.id,
        title: created.title,
        description,
        status: created.status,
        viewsCount: created.viewsCount,
        answersCount: created.answersCount,
        acceptedAnswerId: created.acceptedAnswerId,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        student: {
          id: user.id,
          name: user.name,
          image: user.image ?? null,
        },
        answers: [],
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create question";
      return c.json({ error: msg }, 500);
    }
  }
);

// ─── POST /:courseId/questions/:questionId/answers ───────────────────────────
dashCoursesRouter.post(
  "/:courseId/questions/:questionId/answers",
  zValidator("json", lectureAnswerSchema),
  async (c) => {
    try {
      const courseIdParam = c.req.param("courseId");
      const questionId = c.req.param("questionId");
      const user = c.get("sessionUser");
      const userRole = c.get("userRole");
      const { content } = c.req.valid("json");
      const db = createDb();

      const course = await resolveCourse(db, courseIdParam);
      if (!course) return c.json({ error: "Course not found" }, 404);

      const enrollment = await requireEnrollment(db, course.id, user.id);
      // Teachers can answer without enrollment
      if (!enrollment && userRole !== "TEACHER") {
        return c.json({ error: "Not enrolled" }, 403);
      }

      const question = await db.query.lectureQuestions.findFirst({
        where: and(eq(lectureQuestions.id, questionId), isNull(lectureQuestions.deletedAt)),
        with: {
          lecture: {
            with: { section: true },
          },
        },
      });

      if (!question || question.lecture.section.courseId !== course.id) {
        return c.json({ error: "Question not found" }, 404);
      }

      const [created] = await db
        .insert(lectureQuestionAnswers)
        .values({
          questionId,
          userId: user.id,
          content: { content },
          isInstructorAnswer: userRole === "TEACHER",
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to create answer" }, 500);
      }

      await db
        .update(lectureQuestions)
        .set({ answersCount: question.answersCount + 1 })
        .where(eq(lectureQuestions.id, questionId));

      return c.json({
        id: created.id,
        content,
        isInstructorAnswer: created.isInstructorAnswer,
        isAccepted: created.isAccepted,
        upvotes: created.upvotes,
        createdAt: created.createdAt,
        user: {
          id: user.id,
          name: user.name,
          image: user.image ?? null,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create answer";
      return c.json({ error: msg }, 500);
    }
  }
);
