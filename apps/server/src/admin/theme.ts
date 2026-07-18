import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { siteTheme } from "@oedulms/db/schema/theme";
import type { AppVariables } from "../types";
import { CACHE_KEYS } from "../utils/cache-keys";
import { cacheService } from "../utils/cache";

export const adminThemeRouter = new Hono<AppVariables>();

adminThemeRouter.post("/", async (c) => {
  try {
    const { name, lightTheme, darkTheme } = await c.req.json<{
      name: string;
      lightTheme: Record<string, string>;
      darkTheme: Record<string, string>;
    }>();

    const db = createDb();

    await db
      .insert(siteTheme)
      .values({
        id: "default",
        name,
        lightTheme,
        darkTheme,
      })
      .onConflictDoUpdate({
        target: siteTheme.id,
        set: {
          name,
          lightTheme,
          darkTheme,
        },
      });

    await cacheService.delete(c, CACHE_KEYS.PUBLIC_SITE_THEME);

    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update theme";
    return c.json({ error: msg }, 500);
  }
});
