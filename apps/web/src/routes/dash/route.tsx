import { createFileRoute, redirect, Outlet, Link, useMatchRoute } from "@tanstack/react-router";
import { authQueryOptions } from "@/api/auth";
import { Navbar } from "@/components/navbar";
import { LayoutDashboard, BookOpen, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/dash")({
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQueryOptions);
    if (!auth.user) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: DashLayoutComponent,
});

function DashLayoutComponent() {
  const matchRoute = useMatchRoute();
  const isCoursePlayer = matchRoute({ to: "/dash/courses/$courseId", fuzzy: false });

  // Full-bleed player page: no dashboard header / mobile nav chrome
  if (isCoursePlayer) {
    return (
      <div className="min-h-dvh bg-background text-foreground font-sans">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-16 md:pb-0">
      {/* Reusable rounded floating navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-20 pb-4 flex flex-col gap-8">
        <Outlet />
      </main>

      {/* Mobile Navigation Footer */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-md flex justify-around py-3 z-45 border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link
          to="/dash"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="flex flex-col items-center gap-1 text-xs"
          activeOptions={{ exact: true }}
        >
          <LayoutDashboard className="size-5" />
          <span>Overview</span>
        </Link>
        <Link
          to="/dash/courses"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="flex flex-col items-center gap-1 text-xs"
        >
          <BookOpen className="size-5" />
          <span>Courses</span>
        </Link>
        <Link
          to="/dash/feed"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="flex flex-col items-center gap-1 text-xs"
        >
          <MessageSquare className="size-5" />
          <span>Feed</span>
        </Link>
      </nav>
    </div>
  );
}
