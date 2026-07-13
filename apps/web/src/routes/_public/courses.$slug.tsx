import { createFileRoute } from "@tanstack/react-router";
import { CourseDetailPage } from "@/features/public/courses/course-detail-page";

export const Route = createFileRoute("/_public/courses/$slug")({
  component: CourseDetailPage,
});
