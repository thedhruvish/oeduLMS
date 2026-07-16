import * as React from "react";
import { createFileRoute, redirect, Outlet, useLocation } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@oedulms/ui/components/sidebar";

import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeaderActions } from "@/components/admin-header-actions";
import { authQueryOptions } from "@/api/auth";
import { useUploadStore } from "@/store/upload-store";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQueryOptions);
    if (!auth.user) {
      throw redirect({ to: "/auth/login" });
    }
    if (auth.role !== "TEACHER") {
      throw redirect({ to: "/dash" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const location = useLocation();
  const isUploadingAny = useUploadStore((state) => state.isUploadingAny());

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploadingAny) {
        e.preventDefault();
        e.returnValue =
          "Active uploads are in progress. If you leave or refresh, S3 file uploads will be aborted.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploadingAny]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.endsWith("/admin/courses")) return "Courses";
    if (path.endsWith("/admin/students")) return "Students";
    if (path.endsWith("/admin/enrollments")) return "Enrollments";
    if (path.endsWith("/admin/coupons")) return "Coupons";
    if (path.endsWith("/admin/theme")) return "Theme Settings";
    return "Overview";
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="h-screen overflow-hidden flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 justify-between bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{getPageTitle()}</span>
          </div>
          <AdminHeaderActions />
        </header>
        <main className="flex-1 p-6 bg-background overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
