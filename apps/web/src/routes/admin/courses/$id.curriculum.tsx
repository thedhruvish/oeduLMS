import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertCircle, Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@oedulms/ui/components/button";
import { Skeleton } from "@oedulms/ui/components/skeleton";
import { useCourse } from "@/api/courses";
import {
  CurriculumBuilder,
  type CurriculumBuilderRef,
} from "@/features/courses/curriculum-builder";

export const Route = createFileRoute("/admin/courses/$id/curriculum")({
  component: AdminCourseCurriculumComponent,
});

function CurriculumPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-6 w-56 rounded" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* Body skeleton */}
      <div className="flex-1 p-4 sm:p-6 border rounded-lg bg-card overflow-hidden flex flex-col gap-5">
        {/* Section card 1 */}
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-b">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-4 w-44 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="size-7 rounded-md" />
                ))}
              </div>
            </div>
            {/* Lecture rows */}
            <div className="divide-y">
              {[1, 2, 3].map((k) => (
                <div key={k} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-3.5 rounded" />
                    <Skeleton className="w-7 h-5 rounded" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3.5 w-40 rounded" />
                      <Skeleton className="h-2.5 w-20 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="size-7 rounded-md" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Add lecture button */}
            <div className="px-4 py-3">
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCourseCurriculumComponent() {
  const { id } = Route.useParams();
  const { data: course, isLoading, isError, error } = useCourse(id);
  const builderRef = React.useRef<CurriculumBuilderRef>(null);

  if (isLoading) {
    return <CurriculumPageSkeleton />;
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
