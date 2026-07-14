import { useNavigate } from "@tanstack/react-router";
import { User, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@oedulms/ui/components/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Button } from "@oedulms/ui/components/button";
import { useAuth, useLogout } from "@/api/auth";
import { useConfirm, useConfirmStore } from "@/store/confirm-store";

export function UserProfileDropdown() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const logoutMutation = useLogout();
  const confirm = useConfirm();

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "Log Out",
      desc: "Are you sure you want to log out of your account?",
      destructive: true,
      confirmText: "Log out",
      cancelBtnText: "Cancel",
      closeOnConfirm: false,
    });

    if (!isConfirmed) return;

    useConfirmStore.getState().setIsLoading(true);

    try {
      await logoutMutation.mutateAsync();
      toast.success("Successfully logged out");
      navigate({ to: "/auth/login" });
    } catch {
      toast.error("Failed to log out");
    } finally {
      useConfirmStore.getState().close();
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const isTeacher = role === "TEACHER";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative size-8 rounded-full overflow-hidden hover:bg-muted p-0 border border-border/40"
          />
        }
      >
        <Avatar className="size-8">
          {user?.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2 border rounded-(--radius-xl) shadow-lg">
        <div className="flex flex-col gap-1 p-3 select-none">
          <span className="text-sm font-semibold truncate text-foreground">{user?.name}</span>
          <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
        </div>
        <DropdownMenuSeparator />

        {/* Dashboard Link for both roles */}
        <DropdownMenuItem
          onClick={() => navigate({ to: isTeacher ? "/admin" : "/dash" })}
          className="cursor-pointer"
        >
          <LayoutDashboard className="size-4 mr-2" />
          <span>Dashboard</span>
        </DropdownMenuItem>

        {isTeacher ? (
          <>
            <DropdownMenuItem
              onClick={() => navigate({ to: "/admin/settings" })}
              className="cursor-pointer"
            >
              <Settings className="size-4 mr-2" />
              <span>System Settings</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={() => navigate({ to: "/dash/profile" })}
            className="cursor-pointer"
          >
            <User className="size-4 mr-2" />
            <span>My Profile</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive cursor-pointer hover:bg-destructive/10"
        >
          <LogOut className="size-4 mr-2" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
