import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCoursesComponent,
});

function AdminCoursesComponent() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center flex flex-col items-center gap-4">
        <h2 className="text-lg font-bold">No courses created yet</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Get started by creating your very first course curriculum for students.
        </p>
      </div>
    </div>
  );
}
