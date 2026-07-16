import { Hono } from "hono";
import type { AppVariables } from "../types";
import { publicCoursesRouter } from "../public/courses";
import { publicCouponsRouter } from "../public/coupons";
import { publicPaymentsRouter } from "../public/payments";
import { videoCallbackRouter } from "../public/video";
import { publicThemeRouter } from "../public/theme";

export const publicRouter = new Hono<AppVariables>();

// Mount public sub-routers
publicRouter.route("/courses", publicCoursesRouter);
publicRouter.route("/coupons", publicCouponsRouter);
publicRouter.route("/payments", publicPaymentsRouter);
publicRouter.route("/theme", publicThemeRouter);
// Video pipeline callbacks (authenticated via shared secret, not user auth)
publicRouter.route("/video", videoCallbackRouter);
