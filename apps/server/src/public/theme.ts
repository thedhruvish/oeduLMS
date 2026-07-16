import { Hono } from "hono";
import { createDb } from "@oedulms/db";
import { siteTheme } from "@oedulms/db/schema/theme";
import { eq } from "@oedulms/db/dzl";
import type { AppVariables } from "../types";

export const publicThemeRouter = new Hono<AppVariables>();

const DEFAULT_LIGHT_THEME: Record<string, string> = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0 0)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.145 0 0)",
  "--primary": "oklch(0.205 0 0)",
  "--primary-foreground": "oklch(0.985 0 0)",
  "--secondary": "oklch(0.97 0 0)",
  "--secondary-foreground": "oklch(0.205 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-foreground": "oklch(0.556 0 0)",
  "--accent": "oklch(0.97 0 0)",
  "--accent-foreground": "oklch(0.205 0 0)",
  "--destructive": "oklch(0.58 0.22 27)",
  "--border": "oklch(0.922 0 0)",
  "--input": "oklch(0.922 0 0)",
  "--ring": "oklch(0.708 0 0)",
  "--color-dv-primary": "oklch(0.627 0.265 29.866)",
  "--color-dv-hover": "oklch(0.527 0.265 29.866)",
  "--color-dv-bg": "oklch(0.1 0 0)",
  "--color-dv-surface": "oklch(0.15 0 0)",
  "--color-dv-text": "oklch(0.985 0 0)",
  "--color-dv-text-muted": "oklch(0.708 0 0)",
};

const DEFAULT_DARK_THEME: Record<string, string> = {
  "--background": "oklch(0.145 0 0)",
  "--foreground": "oklch(0.985 0 0)",
  "--card": "oklch(0.205 0 0)",
  "--card-foreground": "oklch(0.985 0 0)",
  "--popover": "oklch(0.205 0 0)",
  "--popover-foreground": "oklch(0.985 0 0)",
  "--primary": "oklch(0.87 0 0)",
  "--primary-foreground": "oklch(0.205 0 0)",
  "--secondary": "oklch(0.269 0 0)",
  "--secondary-foreground": "oklch(0.985 0 0)",
  "--muted": "oklch(0.269 0 0)",
  "--muted-foreground": "oklch(0.708 0 0)",
  "--accent": "oklch(0.371 0 0)",
  "--accent-foreground": "oklch(0.985 0 0)",
  "--destructive": "oklch(0.704 0.191 22.216)",
  "--border": "oklch(1 0 0 / 10%)",
  "--input": "oklch(1 0 0 / 15%)",
  "--ring": "oklch(0.556 0 0)",
  "--color-dv-primary": "oklch(0.627 0.265 29.866)",
  "--color-dv-hover": "oklch(0.527 0.265 29.866)",
  "--color-dv-bg": "oklch(0.1 0 0)",
  "--color-dv-surface": "oklch(0.15 0 0)",
  "--color-dv-text": "oklch(0.985 0 0)",
  "--color-dv-text-muted": "oklch(0.708 0 0)",
};

publicThemeRouter.get("/", async (c) => {
  try {
    const db = createDb();
    const theme = await db.query.siteTheme.findFirst({
      where: eq(siteTheme.id, "default"),
    });

    if (!theme) {
      return c.json({
        id: "default",
        name: "Default Theme",
        lightTheme: DEFAULT_LIGHT_THEME,
        darkTheme: DEFAULT_DARK_THEME,
      });
    }

    return c.json(theme);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch theme";
    return c.json({ error: msg }, 500);
  }
});
