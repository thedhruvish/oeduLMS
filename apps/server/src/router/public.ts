import { Hono } from "hono";
import type { AppVariables } from "../types";
import { publicCoursesRouter } from "../public/courses";
import { publicCouponsRouter } from "../public/coupons";

export const publicRouter = new Hono<AppVariables>();

// Mount public sub-routers
publicRouter.route("/courses", publicCoursesRouter);
publicRouter.route("/coupons", publicCouponsRouter);
