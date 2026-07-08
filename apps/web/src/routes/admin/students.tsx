import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/students")({
  component: AdminStudentsComponent,
});

function AdminStudentsComponent() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center flex flex-col items-center gap-4">
        <h2 className="text-lg font-bold">No students registered yet</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Students will appear here once they enroll in your courses.
        </p>
      </div>
    </div>
  );
}
