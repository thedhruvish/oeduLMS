import { createFileRoute } from "@tanstack/react-router";
import { CoursesPage } from "@/features/public/courses/courses-page";

export const Route = createFileRoute("/_public/courses/")({
  component: CoursesPage,
});
