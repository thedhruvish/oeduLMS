import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Users,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Ticket,
  Settings,
  MessageSquare,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar,
} from "@oedulms/ui/components/sidebar";
import { useAuthStore } from "@/store/auth/auth-store";
import { useLogout } from "@/api/auth";

export function AdminSidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const { state, isMobile, setOpenMobile } = useSidebar();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Successfully logged out");
      if (isMobile) {
        setOpenMobile(false);
      }
      navigate({ to: "/auth/login" });
    } catch {
      toast.error("Failed to log out");
    }
  };

  const navItems = [
    {
      title: "Dashboard",
      to: "/admin/dash",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "Courses",
      to: "/admin/courses",
      icon: BookOpen,
    },
    {
      title: "Coupons",
      to: "/admin/coupons",
      icon: Ticket,
    },
    {
      title: "Enrollments",
      to: "/admin/enrollments",
      icon: GraduationCap,
    },
    {
      title: "Students",
      to: "/admin/students",
      icon: Users,
    },
    {
      title: "Social Feed",
      to: "/admin/feed",
      icon: MessageSquare,
    },
    {
      title: "Theme Settings",
      to: "/admin/theme",
      icon: Palette,
    },
    {
      title: "Settings",
      to: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-16 flex flex-row items-center justify-between px-4 py-0 group/header">
        {state === "expanded" ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 font-bold text-lg text-primary">
              <GraduationCap className="size-6" />
              <span>oEdu LMS</span>
            </div>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </div>
        ) : (
          <div className="relative size-full flex items-center justify-center">
            {/* Logo shown by default, fades out on hover */}
            <div className="transition-opacity duration-200 group-hover/header:opacity-0 flex items-center justify-center">
              <GraduationCap className="size-6 text-primary animate-pulse" />
            </div>
            {/* SidebarTrigger absolute positioned, starts invisible, fades in on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Teacher Administration</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  render={
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.exact }}
                      activeProps={{
                        className: "bg-primary/10 text-primary font-medium",
                      }}
                    />
                  }
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 flex flex-col gap-2">
        {state === "expanded" && user && (
          <div className="flex flex-col px-2 min-w-0">
            <span className="text-sm font-semibold truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <div className="flex justify-center px-1">
          <ThemeToggle iconOnly={state === "collapsed"} className="w-full justify-start" />
        </div>

        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
          tooltip="Sign Out"
        >
          <LogOut className="size-4" />
          {state === "expanded" && <span>Sign Out</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
