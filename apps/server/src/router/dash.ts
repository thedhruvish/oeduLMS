import { Hono } from "hono";
import type { AppVariables } from "../types";
import { dashEnrollmentsRouter } from "../dash/enrollments";

export const dashRouter = new Hono<AppVariables>();

// /dash routes — accessible to authenticated users (students + teachers)
dashRouter.route("/enrollments", dashEnrollmentsRouter);

// Add student-facing routes here as the app grows
dashRouter.get("/", (c) => {
  const user = c.get("sessionUser");
  return c.json({ message: "Student dashboard", user });
});
