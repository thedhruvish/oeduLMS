import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Search, 
  LogOut, 
  BookOpen, 
  Users, 
  GraduationCap, 
  LayoutDashboard,
  Ticket,
  Settings,
  MessageSquare,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { UploadsHeaderIndicator } from "@/components/ui/uploads-header-indicator";

import { UserProfileDropdown } from "@/components/profile-dropdown";
import { Button } from "@oedulms/ui/components/button";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@oedulms/ui/components/command";
import { useLogout } from "@/api/auth";
import { ThemeToggle } from "./theme-toggle";

export function AdminHeaderActions() {
  const navigate = useNavigate();
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
      {/* <Popover>
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
      </Popover> */}
      <div className="flex justify-center px-1">
        <ThemeToggle className="w-full justify-start" />
      </div>

      {/* User Profile Avatar Dropdown */}
      <UserProfileDropdown />

      {/* Command Palette Dialog */}
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleCommandSelect("/admin/dash")}>
              <LayoutDashboard className="size-4" />
              <span>Go to Overview Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/courses")}>
              <BookOpen className="size-4" />
              <span>Go to Courses Catalogue</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/coupons")}>
              <Ticket className="size-4" />
              <span>Go to Coupons Management</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/enrollments")}>
              <GraduationCap className="size-4" />
              <span>Go to Active Enrollments</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/students")}>
              <Users className="size-4" />
              <span>Go to Enrolled Students</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/feed")}>
              <MessageSquare className="size-4" />
              <span>Go to Social Feed Forum</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/theme")}>
              <Palette className="size-4" />
              <span>Go to Theme Settings</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect("/admin/settings")}>
              <Settings className="size-4" />
              <span>Go to System Settings</span>
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
