import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Edit2, Eye, Trash2, BookOpen, AlertCircle, IndianRupee } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { Card, CardContent } from "@oedulms/ui/components/card";
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
    const ok = await confirm({
      title: "Delete Course",
      desc: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      destructive: true,
      confirmText: "Delete",
    });

    if (!ok) return;

    deleteCourseMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`Course "${title}" deleted successfully.`);
      },
      onError: () => {
        toast.error(`Failed to delete course "${title}".`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video w-full animate-pulse bg-muted" />
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 pt-2 border-t">
                  <div className="h-7 w-14 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-18 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-14 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="size-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load courses</h2>
        <p className="text-muted-foreground mt-1">
          {error?.message || "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Catalog</h1>
        <Button render={<Link to="/admin/courses/new" />}>
          <Plus className="size-4" data-icon="inline-start" />
          New Course
        </Button>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              {course.thumbnail ? (
                <div>
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="aspect-video object-cover w-full"
                  />
                </div>
              ) : (
                <div className="bg-muted/40 aspect-video flex items-center justify-center">
                  <BookOpen className="size-10 text-muted-foreground" />
                </div>
              )}

              <CardContent className="p-4 flex flex-col gap-3">
                <h3 className="font-semibold text-foreground truncate">{course.title}</h3>

                <div className="text-sm font-medium">
                  {course.price === 0 ? (
                    <span className="text-primary">Free</span>
                  ) : course.discountPrice != null ? (
                    <span className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground flex items-center gap-0.5">
                        <IndianRupee className="size-3" />
                        {course.price.toFixed(2)}
                      </span>
                      <span className="text-primary flex items-center gap-0.5">
                        <IndianRupee className="size-3" />
                        {course.discountPrice.toFixed(2)}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="size-3" />
                      {course.price.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    render={<Link to="/admin/courses/$id" params={{ id: course.id }} />}
                    size="xs"
                    variant="outline"
                  >
                    <Eye className="size-3" data-icon="inline-start" />
                    View
                  </Button>
                  <Button
                    render={<Link to="/admin/courses/$id/curriculum" params={{ id: course.id }} />}
                    size="xs"
                    variant="outline"
                    className="text-primary hover:bg-primary/10 hover:text-primary border-primary/20"
                  >
                    <BookOpen className="size-3" data-icon="inline-start" />
                    Add Lecture
                  </Button>
                  <Button
                    render={<Link to="/admin/courses/$id/edit" params={{ id: course.id }} />}
                    size="xs"
                    variant="outline"
                  >
                    <Edit2 className="size-3" data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(course.id, course.title)}
                    disabled={deleteCourseMutation.isPending}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No courses yet</h2>
          <p className="text-muted-foreground mt-1">Get started by creating your first course.</p>
          <Button render={<Link to="/admin/courses/new" />} className="mt-4">
            <Plus className="size-4" data-icon="inline-start" />
            New Course
          </Button>
        </div>
      )}
    </div>
  );
}
