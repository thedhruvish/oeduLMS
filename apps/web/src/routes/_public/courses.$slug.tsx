import { createFileRoute } from "@tanstack/react-router";
import { CourseDetailPage } from "@/features/public/courses/course-detail-page";
import {
  publicCourseDetailQueryOptions,
  publicCourseCurriculumQueryOptions,
  publicCourseFaqsQueryOptions,
} from "@/api/courses";

export const Route = createFileRoute("/_public/courses/$slug")({
  loader: async ({ params: { slug }, context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(publicCourseDetailQueryOptions(slug)),
      queryClient.ensureQueryData(publicCourseCurriculumQueryOptions(slug)),
      queryClient.ensureQueryData(publicCourseFaqsQueryOptions(slug)),
    ]);
  },
  component: CourseDetailPage,
});
