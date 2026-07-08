import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authQueryOptions } from "@/api/auth";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQueryOptions);
    if (auth.user) {
      if (auth.role === "TEACHER") {
        throw redirect({ to: "/admin" });
      } else {
        throw redirect({ to: "/dash" });
      }
    }
  },
  component: AuthLayoutComponent,
});

function AuthLayoutComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
