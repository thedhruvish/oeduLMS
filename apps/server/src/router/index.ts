import { Hono } from "hono";
import type { AppVariables } from "../types";
import { authGuard } from "../middleware/auth";
import { adminRouter } from "./admin";
import { dashRouter } from "./dash";
import { publicRouter } from "./public";

/**
 * Main API router.
 * All routes here are protected by authGuard at the top level.
 * Sub-routers can add further role-based guards as needed.
 */
export const apiRouter = new Hono<AppVariables>();

// Public API routes
apiRouter.route("/public", publicRouter);

// Single shared auth check for all /api/admin and /api/dash routes
apiRouter.use("*", authGuard);

// Mount routers
apiRouter.route("/admin", adminRouter);
apiRouter.route("/dash", dashRouter);
