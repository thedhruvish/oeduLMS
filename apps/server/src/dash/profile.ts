import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { studentProfiles } from "@oedulms/db/schema/profiles";
import { user } from "@oedulms/db/schema/auth";
import { eq } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";
import { zValidator } from "@hono/zod-validator";
import { profileUpdateScheme } from "@oedulms/validator";
import { deleteS3Object } from "@/utils/s3-client";

export const dashProfileRouter = new Hono<AppVariables>();

dashProfileRouter.get("/", async (c) => {
  try {
    const sessionUser = c.get("sessionUser");

    const db = createDb();
    let profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, sessionUser.id),
    });

    if (!profile) {
      const [newProfile] = await db
        .insert(studentProfiles)
        .values({
          userId: sessionUser.id,
        })
        .returning();
      profile = newProfile;
    }

    return c.json({
      user: sessionUser,
      profile,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch profile";
    return c.json({ error: msg }, 500);
  }
});

dashProfileRouter.put("/", zValidator("json", profileUpdateScheme), async (c) => {
  try {
    const sessionUser = c.get("sessionUser");

    const body = c.req.valid("json");

    const db = createDb();

    // If updating profile picture, fetch current one and delete from S3 first
    if (body.image !== undefined) {
      const currentUser = await db.query.user.findFirst({
        where: eq(user.id, sessionUser.id),
      });

      if (currentUser?.image && currentUser.image !== body.image) {
        try {
          const urlObj = new URL(currentUser.image);
          const key = decodeURIComponent(urlObj.pathname.slice(1));
          if (key && (key.startsWith("avatars/") || key.startsWith("general/"))) {
            await deleteS3Object(c, key);
          }
        } catch (err) {
          console.warn("Could not delete old avatar key from S3:", err);
        }
      }
    }

    if (body.name || body.image !== undefined) {
      await db
        .update(user)
        .set({
          ...(body.name ? { name: body.name } : {}),
          ...(body.image !== undefined ? { image: body.image } : {}),
        })
        .where(eq(user.id, sessionUser.id));
    }

    const existing = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, sessionUser.id),
    });

    if (existing) {
      await db
        .update(studentProfiles)
        .set({
          ...(body.bio !== undefined ? { bio: body.bio ?? null } : {}),
          ...(body.headline !== undefined ? { headline: body.headline ?? null } : {}),
          ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
          ...(body.country !== undefined ? { country: body.country ?? null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.userId, sessionUser.id));
    } else {
      await db.insert(studentProfiles).values({
        userId: sessionUser.id,
        bio: body.bio ?? null,
        headline: body.headline ?? null,
        phone: body.phone ?? null,
        country: body.country ?? null,
      });
    }

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update profile";
    return c.json({ error: msg }, 500);
  }
});

dashProfileRouter.get("/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const db = createDb();

    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        id: true,
        name: true,
        image: true,
      },
    });

    if (!userRecord) {
      return c.json({ error: "User not found" }, 404);
    }

    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, userId),
      columns: {
        id: true,
        userId: true,
        bio: true,
        headline: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json({
      user: userRecord,
      profile: profile || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch profile";
    return c.json({ error: msg }, 500);
  }
});
