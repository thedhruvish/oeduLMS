import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { posts, postLikes, postComments } from "@oedulms/db/schema/posts";
import { systemSettings } from "@oedulms/db/schema/profiles";
import { eq, desc, and } from "@oedulms/db/dzl";
import { zValidator } from "@hono/zod-validator";
import { commentSchema, postSchema } from "@oedulms/validator";
import type { AppVariables } from "../types";
import { deleteS3Object } from "@/utils/s3-client";

export const dashPostsRouter = new Hono<AppVariables>();

dashPostsRouter.get("/", async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

    const db = createDb();
    const list = await db.query.posts.findMany({
      orderBy: desc(posts.createdAt),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        likes: true,
        comments: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: desc(postComments.createdAt),
        },
      },
    });

    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "allow_student_posts"),
    });
    const allowStudentPosts = setting ? setting.value === "true" : true;

    const formatted = list.map((post) => {
      const isLiked = post.likes.some((like) => like.userId === sessionUser.id);
      return {
        id: post.id,
        content: post.content,
        image: post.image,
        video: post.video,
        createdAt: post.createdAt,
        author: post.author,
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
        isLiked,
        comments: post.comments,
      };
    });

    return c.json({
      posts: formatted,
      allowStudentPosts,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch posts";
    return c.json({ error: msg }, 500);
  }
});

dashPostsRouter.post("/", zValidator("json", postSchema), async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);
    const userRole = c.get("userRole");

    const db = createDb();

    // Check permission settings
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "allow_student_posts"),
    });
    const allowStudentPosts = setting ? setting.value === "true" : true;

    if (userRole === "STUDENT" && !allowStudentPosts) {
      return c.json({ error: "Posting is disabled by the administrator" }, 403);
    }

    const { content, image, video } = c.req.valid("json");

    const [newPost] = await db
      .insert(posts)
      .values({
        authorId: sessionUser.id,
        content,
        image: image || null,
        video: video || null,
      })
      .returning();

    if (!newPost) {
      return c.json({ error: "Failed to create post" }, 500);
    }

    const fullPost = await db.query.posts.findFirst({
      where: eq(posts.id, newPost.id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        likes: true,
        comments: true,
      },
    });

    if (!fullPost) throw new Error("Failed to retrieve created post");

    return c.json({
      id: fullPost.id,
      content: fullPost.content,
      image: fullPost.image,
      video: fullPost.video,
      createdAt: fullPost.createdAt,
      author: fullPost.author,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      comments: [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create post";
    return c.json({ error: msg }, 500);
  }
});

dashPostsRouter.post("/:id/like", async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

    const postId = c.req.param("id");
    const db = createDb();

    const existingLike = await db.query.postLikes.findFirst({
      where: and(eq(postLikes.postId, postId), eq(postLikes.userId, sessionUser.id)),
    });

    if (existingLike) {
      await db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, sessionUser.id)));
      return c.json({ liked: false });
    } else {
      await db.insert(postLikes).values({
        postId,
        userId: sessionUser.id,
      });
      return c.json({ liked: true });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to toggle like";
    return c.json({ error: msg }, 500);
  }
});

dashPostsRouter.post("/:id/comment", zValidator("json", commentSchema), async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

    const postId = c.req.param("id");
    const { comment, parentId } = c.req.valid("json");

    const db = createDb();
    const [newComment] = await db
      .insert(postComments)
      .values({
        postId,
        userId: sessionUser.id,
        comment,
        parentId: parentId || null,
      })
      .returning();

    if (!newComment) {
      return c.json({ error: "Failed to add comment" }, 500);
    }

    const fullComment = await db.query.postComments.findFirst({
      where: eq(postComments.id, newComment.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return c.json(fullComment);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add comment";
    return c.json({ error: msg }, 500);
  }
});

dashPostsRouter.delete("/:id", async (c) => {
  try {
    const sessionUser = c.get("sessionUser");
    if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const db = createDb();

    // Check ownership
    const postRecord = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!postRecord) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (postRecord.authorId !== sessionUser.id) {
      return c.json({ error: "Forbidden: You are not the author of this post" }, 403);
    }

    // Clean up S3 attachments if any
    if (postRecord.image) {
      try {
        const urlObj = new URL(postRecord.image);
        const key = decodeURIComponent(urlObj.pathname.slice(1));
        if (
          key &&
          (key.startsWith("general/") || key.startsWith("feed/") || key.startsWith("posts/"))
        ) {
          await deleteS3Object(c, key);
        }
      } catch (err) {
        console.warn("Could not delete post image S3 object:", err);
      }
    }

    if (postRecord.video) {
      try {
        const urlObj = new URL(postRecord.video);
        const key = decodeURIComponent(urlObj.pathname.slice(1));
        if (
          key &&
          (key.startsWith("general/") || key.startsWith("feed/") || key.startsWith("posts/"))
        ) {
          await deleteS3Object(c, key);
        }
      } catch (err) {
        console.warn("Could not delete post video S3 object:", err);
      }
    }

    await db.delete(posts).where(eq(posts.id, id));

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete post";
    return c.json({ error: msg }, 500);
  }
});
