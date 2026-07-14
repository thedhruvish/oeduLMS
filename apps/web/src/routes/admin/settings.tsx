import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSystemSettings, useUpdateSystemSettings } from "@/api/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@oedulms/ui/components/card";
import { Switch } from "@oedulms/ui/components/switch";
import { Settings, ShieldAlert, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsComponent,
});

function AdminSettingsComponent() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettingsMutation = useUpdateSystemSettings();

  const handleToggleStudentPosts = async (checked: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        allowStudentPosts: checked,
      });
      toast.success(
        checked ? "Student posting enabled successfully!" : "Student posting disabled successfully!"
      );
    } catch {
      toast.error("Failed to update system settings.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-2xl">
        <div className="h-8 w-48 bg-muted/40 rounded" />
        <div className="h-44 w-full bg-muted/40 rounded-2xl" />
      </div>
    );
  }

  const allowStudentPosts = settings?.allowStudentPosts ?? true;

  return (
    <div className="max-w-2xl flex flex-col gap-6 animate-in fade-in duration-300 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage general LMS preferences, social features, and security settings.
        </p>
      </div>

      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            <CardTitle className="text-base font-bold">Community & Discussion</CardTitle>
          </div>
          <CardDescription className="text-xs pt-1">
            Configure how students interact on the social feed platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">Allow Students to Post</span>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                When enabled, students can create new posts and ask doubts on the community social
                feed. When disabled, only teachers can post, but students can still read, like, and
                comment.
              </p>
            </div>
            <div className="pt-1.5">
              <Switch
                checked={allowStudentPosts}
                onCheckedChange={handleToggleStudentPosts}
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 mt-2">
            {allowStudentPosts ? (
              <div className="flex items-start gap-2.5 text-xs text-green-700 bg-green-500/5 border border-green-500/10 p-3 rounded-(--radius-xl)">
                <CheckCircle className="size-4 shrink-0 mt-0.5" />
                <p className="leading-normal font-medium">
                  Students currently have permissions to write new posts on the social feed.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 text-xs text-amber-700 bg-amber-500/5 border border-amber-500/10 p-3 rounded-(--radius-xl)">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <p className="leading-normal font-medium">
                  Posting is restricted. Only instructors and teachers can submit new posts.
                  Students can still write comments.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
