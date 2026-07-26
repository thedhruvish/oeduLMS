import { createFileRoute, notFound } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { CourseDetailPage } from "@/features/public/courses/course-detail-page";
import {
  publicCourseDetailQueryOptions,
  publicCourseCurriculumQueryOptions,
  publicCourseFaqsQueryOptions,
} from "@/api/courses";

export const Route = createFileRoute("/_public/courses/$slug")({
  loader: async ({ params: { slug }, context: { queryClient } }) => {
    try {
      await Promise.all([
        queryClient.ensureQueryData(publicCourseDetailQueryOptions(slug)),
        queryClient.ensureQueryData(publicCourseCurriculumQueryOptions(slug)),
        queryClient.ensureQueryData(publicCourseFaqsQueryOptions(slug)),
      ]);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw notFound();
      }
      throw error;
    }
  },
  component: CourseDetailPage,
});
