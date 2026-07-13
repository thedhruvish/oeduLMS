import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { CourseForm } from "@/features/courses/course-form";
import { useCourse, useUpdateCourse } from "@/api/courses";
import type { CourseInput } from "@oedulms/validator";

export const Route = createFileRoute("/admin/courses/$id/edit")({
  component: AdminEditCourseComponent,
});

function AdminEditCourseComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: course, isLoading, isError, error } = useCourse(id);
  const updateCourseMutation = useUpdateCourse(id);
  const formRef = useRef<HTMLFormElement>(null);

  const handleUpdate = async (values: CourseInput) => {
    try {
      await updateCourseMutation.mutateAsync(values);
      toast.success("Course updated successfully!");
      navigate({ to: "/admin/courses" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update course.";
      toast.error(message);
    }
  };

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

  const initialFormValues: CourseInput = {
    title: course.title,
    shortDescription: course.shortDescription || "",
    description: course.description || "",
    price: course.price,
    discountPrice: course.discountPrice ?? null,
    currency: course.currency || "USD",
    thumbnail: course.thumbnail || "",
    trailerVideo: course.trailerVideo || "",
    durationSeconds: course.durationSeconds || 0,
    totalLectures: course.totalLectures || 0,
    certificateEnabled: course.certificateEnabled || false,
    status: course.status,
    language: course.language || "",
    validateDays: course.validateDays ?? null,
    faqs: course.faqs?.map((f) => ({ question: f.question, answer: f.answer })) ?? [],
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            render={<Link to="/admin/courses" />}
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-bold">Edit: {course.title}</h2>
        </div>

        <Button
          onClick={() => formRef.current?.requestSubmit()}
          disabled={updateCourseMutation.isPending}
          size="sm"
        >
          {updateCourseMutation.isPending && (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="flex-1 p-6 border rounded-lg bg-card overflow-hidden">
        <CourseForm
          formRef={formRef}
          defaultValues={initialFormValues}
          onSubmit={handleUpdate}
          isPending={updateCourseMutation.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
