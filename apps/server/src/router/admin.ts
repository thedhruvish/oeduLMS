import { Hono } from "hono";
import type { AppVariables } from "../types";
import { teacherGuard } from "../middleware/auth";
import { adminCoursesRouter } from "../admin/courses";

export const adminRouter = new Hono<AppVariables>();

// All /admin routes require teacher role
adminRouter.use("*", teacherGuard);

// Mount sub-routers
adminRouter.route("/courses", adminCoursesRouter);
