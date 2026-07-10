import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Edit2, Eye, Trash2, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { Badge } from "@oedulms/ui/components/badge";
import { useCourses, useDeleteCourse } from "@/api/courses";
import { useConfirm } from "@/store/confirm-store";

export const Route = createFileRoute("/admin/courses/")({
  component: AdminCoursesListComponent,
});

function AdminCoursesListComponent() {
  const { data: courses, isLoading, isError, error } = useCourses();
  const deleteCourseMutation = useDeleteCourse();
  const confirm = useConfirm();

  const handleDelete = async (id: string, title: string) => {
    const isConfirmed = await confirm({
      title: "Delete Course?",
      desc: `Are you sure you want to delete the course "${title}"?`,
      destructive: true,
      confirmText: "Delete",
    });
    if (isConfirmed) {
      try {
        await deleteCourseMutation.mutateAsync(id);
        toast.success("Course deleted successfully!");
      } catch {
        toast.error("Failed to delete course.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-28 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-card border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-3">
        <AlertCircle className="size-5 text-destructive shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-destructive">Error Loading Courses</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load courses catalogue."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Catalog</h2>
        <Button render={<Link to="/admin/courses/new" />} size="sm">
          <Plus className="size-4" data-icon="inline-start" />
          New Course
        </Button>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-muted-foreground/15 rounded-lg text-center flex flex-col items-center gap-4">
          <div className="p-3 bg-primary/5 rounded-full">
            <BookOpen className="size-8 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">No courses created yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Get started by creating your very first course curriculum.
            </p>
          </div>
          <Button render={<Link to="/admin/courses/new" />} size="sm" className="mt-2">
            <Plus className="size-4" data-icon="inline-start" />
            Create Course
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="divide-y">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/30 transition"
              >
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate text-foreground">{course.title}</span>
                    <Badge variant={course.status === "PUBLISHED" ? "default" : "secondary"}>
                      {course.status}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-muted-foreground">
                      {course.level.toLowerCase()}
                    </Badge>
                  </div>
                  {course.shortDescription && (
                    <p className="text-xs text-muted-foreground truncate max-w-xl">
                      {course.shortDescription}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  <span className="text-sm font-bold text-foreground">
                    {course.price === 0 ? "Free" : `$${course.price.toFixed(2)}`}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      render={<Link to="/admin/courses/$id" params={{ id: course.id }} />}
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title="View Details"
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      render={
                        <Link to="/admin/courses/$id/curriculum" params={{ id: course.id }} />
                      }
                      size="icon"
                      variant="ghost"
                      className="size-8 text-primary hover:bg-primary/10 hover:text-primary"
                      title="Manage Curriculum"
                    >
                      <BookOpen className="size-4" />
                    </Button>
                    <Button
                      render={<Link to="/admin/courses/$id/edit" params={{ id: course.id }} />}
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title="Edit Details"
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(course.id, course.title)}
                      disabled={deleteCourseMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
