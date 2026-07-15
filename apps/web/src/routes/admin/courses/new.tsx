import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { CourseForm } from "@/features/courses/course-form";
import { useCreateCourse } from "@/api/courses";
import type { CourseInput } from "@oedulms/validator";

export const Route = createFileRoute("/admin/courses/new")({
  component: AdminCreateCourseComponent,
});

function AdminCreateCourseComponent() {
  const navigate = useNavigate();
  const createCourseMutation = useCreateCourse();
  const formRef = useRef<HTMLFormElement>(null);

  const handleCreate = async (values: CourseInput) => {
    try {
      await createCourseMutation.mutateAsync(values);
      toast.success("Course created successfully!");
      navigate({ to: "/admin/courses" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create course.";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* Header row with back button, title, and top-right submit */}
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
          <h2 className="text-lg font-bold">New Course</h2>
        </div>

        <Button
          type="submit"
          form="course-form"
          disabled={createCourseMutation.isPending}
          size="sm"
        >
          {createCourseMutation.isPending && (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          )}
          Create Course
        </Button>
      </div>

      <div className="flex-1 p-6 border rounded-lg bg-card overflow-hidden">
        <CourseForm
          formRef={formRef}
          onSubmit={handleCreate}
          isPending={createCourseMutation.isPending}
          submitLabel="Create Course"
        />
      </div>
    </div>
  );
}
