import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertCircle, Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@oedulms/ui/components/button";
import { useCourse } from "@/api/courses";
import {
  CurriculumBuilder,
  type CurriculumBuilderRef,
} from "@/features/courses/curriculum-builder";

export const Route = createFileRoute("/admin/courses/$id/curriculum")({
  component: AdminCourseCurriculumComponent,
});

function AdminCourseCurriculumComponent() {
  const { id } = Route.useParams();
  const { data: course, isLoading, isError, error } = useCourse(id);
  const builderRef = React.useRef<CurriculumBuilderRef>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full h-full animate-pulse">
        <div className="flex gap-4 items-center">
          <div className="size-8 bg-muted rounded" />
          <div className="h-6 w-48 bg-muted rounded" />
        </div>
        <div className="flex-1 bg-card border rounded-lg" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="p-6 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-3">
        <AlertCircle className="size-5 text-destructive shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-destructive">Course Not Found</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "The requested course could not be located."}
          </p>
          <Button
            render={<Link to="/admin/courses" />}
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
          >
            Back to Catalog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden w-full">
      {/* Header row with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            render={<Link to="/admin/courses" />}
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-bold truncate">Curriculum: {course.title}</h2>
        </div>
        <Button
          onClick={() => builderRef.current?.openAddSection()}
          size="sm"
          className="w-full sm:w-auto shrink-0"
        >
          <Plus className="size-4" data-icon="inline-start" />
          Add Section
        </Button>
      </div>

      <div className="flex-1 p-3 sm:p-6 border rounded-lg bg-card overflow-hidden">
        <CurriculumBuilder ref={builderRef} courseId={course.id} />
      </div>
    </div>
  );
}
