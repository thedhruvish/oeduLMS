import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/public/home/home-page";
import { publicCoursesQueryOptions } from "@/api/courses";

export const Route = createFileRoute("/_public/home")({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(publicCoursesQueryOptions),
  component: HomePage,
});
