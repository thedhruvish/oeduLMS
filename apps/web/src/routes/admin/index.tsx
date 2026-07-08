import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth/auth-store";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexComponent,
});

function AdminIndexComponent() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="p-6 bg-card border rounded-lg flex flex-col gap-4">
        <h2 className="text-xl font-bold">Welcome back, {user?.name}!</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="p-4 bg-muted/50 rounded-lg flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Logged In As
            </span>
            <span className="text-sm font-semibold truncate mt-1">{user?.email}</span>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Role
            </span>
            <span className="text-sm font-semibold text-primary capitalize mt-1">
              Instructor / Teacher
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card border rounded-lg flex flex-col gap-2">
          <span className="text-2xl font-bold">0</span>
          <span className="text-sm text-muted-foreground font-semibold">Active Courses</span>
        </div>
        <div className="p-6 bg-card border rounded-lg flex flex-col gap-2">
          <span className="text-2xl font-bold">0</span>
          <span className="text-sm text-muted-foreground font-semibold">Total Students</span>
        </div>
        <div className="p-6 bg-card border rounded-lg flex flex-col gap-2">
          <span className="text-2xl font-bold">$0.00</span>
          <span className="text-sm text-muted-foreground font-semibold">Total Earnings</span>
        </div>
      </div>
    </div>
  );
}
