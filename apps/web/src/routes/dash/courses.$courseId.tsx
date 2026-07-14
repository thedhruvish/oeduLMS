import { createFileRoute } from "@tanstack/react-router";
import { CoursePlayerPage } from "@/features/course-player/course-player-page";

interface CoursePlayerSearch {
  lecture?: string;
}

export const Route = createFileRoute("/dash/courses/$courseId")({
  validateSearch: (search: Record<string, unknown>): CoursePlayerSearch => {
    return {
      lecture: typeof search.lecture === "string" ? search.lecture : undefined,
    };
  },
  component: CoursePlayerRoute,
});

function CoursePlayerRoute() {
  const { courseId } = Route.useParams();
  const { lecture } = Route.useSearch();

  return <CoursePlayerPage courseId={courseId} lectureId={lecture} />;
}
