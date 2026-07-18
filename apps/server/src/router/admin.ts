import { Hono } from "hono";
import type { AppVariables } from "../types";
import { teacherGuard } from "../middleware/auth";
import { adminCoursesRouter } from "../admin/courses";
import { adminMediaRouter } from "../admin/media";
import { adminCurriculumRouter } from "../admin/curriculum";
import { adminStudentsRouter } from "../admin/students";
import { adminCouponsRouter } from "../admin/coupons";
import { enrollmentsRouter } from "../admin/enrollments";
import { adminSettingsRouter } from "../admin/settings";
import { adminVideoRouter } from "../admin/video";
import { adminThemeRouter } from "../admin/theme";
import { adminDashboardRouter } from "../admin/dashboard";

export const adminRouter = new Hono<AppVariables>();

// All /admin routes require teacher role
adminRouter.use("*", teacherGuard);

// Mount sub-routers
adminRouter.route("/courses", adminCoursesRouter);
adminRouter.route("/courses", adminCurriculumRouter);
adminRouter.route("/media", adminMediaRouter);
adminRouter.route("/students", adminStudentsRouter);
adminRouter.route("/coupons", adminCouponsRouter);
adminRouter.route("/enrollments", enrollmentsRouter);
adminRouter.route("/settings", adminSettingsRouter);
adminRouter.route("/video", adminVideoRouter);
adminRouter.route("/theme", adminThemeRouter);
adminRouter.route("/dashboard", adminDashboardRouter);
