import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  Users,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { UploadsHeaderIndicator } from "@/components/ui/uploads-header-indicator";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@oedulms/ui/components/dropdown-menu";
import { Avatar, AvatarFallback } from "@oedulms/ui/components/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@oedulms/ui/components/popover";
import { Button } from "@oedulms/ui/components/button";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@oedulms/ui/components/command";
import { useAuthStore } from "@/store/auth/auth-store";
import { useLogout } from "@/api/auth";

export function AdminHeaderActions() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Command K Shortcut Listener
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Successfully logged out");
      navigate({ to: "/auth/login" });
    } catch {
      toast.error("Failed to log out");
    }
  };

  const handleCommandSelect = (to: string) => {
    setIsSearchOpen(false);
    navigate({ to });
  };

  // Mock Notifications
  const notifications = [
    {
      id: "1",
      title: "New Enrollment",
      description: "John Doe enrolled in React Basics.",
      time: "2 hours ago",
    },
    {
      id: "2",
      title: "Discussion Post",
      description: "New question in TypeScript Core module.",
      time: "5 hours ago",
    },
    {
      id: "3",
      title: "System Update",
      description: "LMS platform updated successfully.",
      time: "1 day ago",
    },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "T";

  return (
    <div className="flex items-center gap-4">
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsSearchOpen(true)}
        className="size-9 text-muted-foreground hover:text-foreground"
      >
        <Search className="size-4" />
      </Button>

      {/* Uploads Indicator */}
      <UploadsHeaderIndicator />

      {/* Notification Bell */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-9 relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
            </Button>
          }
        />
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-4 border-b flex justify-between items-center">
            <span className="font-semibold text-sm">Notifications</span>
            <span className="text-xs text-primary cursor-pointer hover:underline">
              Mark all as read
            </span>
          </div>
          <ScrollArea className="max-h-64">
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 hover:bg-muted/50 transition flex flex-col gap-1"
                >
                  <span className="text-xs font-semibold">{notif.title}</span>
                  <span className="text-xs text-muted-foreground">{notif.description}</span>
                  <span className="text-[10px] text-muted-foreground/60 mt-1">{notif.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* User Profile Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="size-8 rounded-full p-0" />}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col gap-1 p-3 text-xs select-none">
            <span className="text-sm font-semibold truncate text-foreground">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
            <Settings className="size-4 mr-2" />
            <span>Organization Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="size-4 mr-2" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command Palette Dialog */}
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleCommandSelect("/admin")}>
              <LayoutDashboard className="size-4" />
              <span>Go to Overview Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/courses")}>
              <BookOpen className="size-4" />
              <span>Go to Courses Catalogue</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/students")}>
              <Users className="size-4" />
              <span>Go to Enrolled Students</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/enrollments")}>
              <GraduationCap className="size-4" />
              <span>Go to Active Enrollments</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleLogout}>
              <LogOut className="size-4 text-destructive" />
              <span className="text-destructive">Sign Out / Log Out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
