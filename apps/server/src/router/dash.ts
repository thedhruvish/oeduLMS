import { Hono } from "hono";
import type { AppVariables } from "../types";
import { dashEnrollmentsRouter } from "../dash/enrollments";
import { dashPostsRouter } from "../dash/posts";
import { dashProfileRouter } from "../dash/profile";
import { dashMediaRouter } from "../dash/media";
import { dashCoursesRouter } from "../dash/courses";

export const dashRouter = new Hono<AppVariables>();

// /dash routes — accessible to authenticated users (students + teachers)
dashRouter.route("/enrollments", dashEnrollmentsRouter);
dashRouter.route("/courses", dashCoursesRouter);
dashRouter.route("/posts", dashPostsRouter);
dashRouter.route("/profile", dashProfileRouter);
dashRouter.route("/media", dashMediaRouter);

dashRouter.get("/", (c) => {
  const user = c.get("sessionUser");
  return c.json({ message: "Student dashboard", user });
});
