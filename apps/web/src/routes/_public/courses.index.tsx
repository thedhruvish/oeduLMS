import { createFileRoute } from "@tanstack/react-router";
import { CoursesPage } from "@/features/public/courses/courses-page";
import { publicCoursesQueryOptions } from "@/api/courses";

export const Route = createFileRoute("/_public/courses/")({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(publicCoursesQueryOptions),
  component: CoursesPage,
});
