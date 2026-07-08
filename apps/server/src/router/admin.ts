import { Hono } from "hono";
import type { AppVariables } from "../types";
import { teacherGuard } from "../middleware/auth";
import { adminCoursesRouter } from "../admin/courses";
import { adminMediaRouter } from "../admin/media";
import { adminCurriculumRouter } from "../admin/curriculum";

export const adminRouter = new Hono<AppVariables>();

// All /admin routes require teacher role
adminRouter.use("*", teacherGuard);

// Mount sub-routers
adminRouter.route("/courses", adminCoursesRouter);
adminRouter.route("/courses", adminCurriculumRouter);
adminRouter.route("/media", adminMediaRouter);
