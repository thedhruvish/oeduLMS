import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@oedulms/ui/components/button";
import { authQueryOptions } from "@/api/auth";

export const Route = createFileRoute("/dash")({
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQueryOptions);
    if (!auth.user) {
      throw redirect({ to: "/auth/login" });
    }
    if (auth.role === "TEACHER") {
      throw redirect({ to: "/admin" });
    }
  },
  component: DashComponent,
});

function DashComponent() {
  const navigate = useNavigate();
  const context = Route.useRouteContext();
  const user = context.auth?.user;
  const logout = context.auth?.logout;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 flex flex-col gap-6">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <Button
          variant="outline"
          onClick={async () => {
            if (logout) {
              await logout();
              navigate({ to: "/auth/login" });
            }
          }}
        >
          Sign Out
        </Button>
      </div>
      <div className="p-6 bg-card border rounded-lg flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Welcome back, {user?.name}!</h2>
        <p className="text-muted-foreground">
          Email: <span className="font-mono">{user?.email}</span>
        </p>
        <p className="text-muted-foreground">
          Role: <span className="capitalize font-semibold text-primary">{context.auth?.role}</span>
        </p>
      </div>
    </div>
  );
}
