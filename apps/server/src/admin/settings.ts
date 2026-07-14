import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { systemSettings } from "@oedulms/db/schema/profiles";
import { eq } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const adminSettingsRouter = new Hono<AppVariables>();

adminSettingsRouter.get("/", async (c) => {
  try {
    const db = createDb();
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "allow_student_posts"),
    });

    return c.json({
      allowStudentPosts: setting ? setting.value === "true" : true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch settings";
    return c.json({ error: msg }, 500);
  }
});

adminSettingsRouter.post("/", async (c) => {
  try {
    const { allowStudentPosts } = await c.req.json<{ allowStudentPosts: boolean }>();
    const db = createDb();

    await db
      .insert(systemSettings)
      .values({
        key: "allow_student_posts",
        value: allowStudentPosts ? "true" : "false",
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: allowStudentPosts ? "true" : "false",
          updatedAt: new Date(),
        },
      });

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update settings";
    return c.json({ error: msg }, 500);
  }
});
