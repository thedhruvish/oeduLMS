import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/enrollments")({
  component: AdminEnrollmentsComponent,
});

function AdminEnrollmentsComponent() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center flex flex-col items-center gap-4">
        <h2 className="text-lg font-bold">No active enrollments yet</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Enrollment events and logs will populate here upon purchase.
        </p>
      </div>
    </div>
  );
}
