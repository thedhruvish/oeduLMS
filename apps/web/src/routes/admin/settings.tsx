import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSystemSettings,
  useUpdateSystemSettings,
  useActiveSessions,
  useRevokeSession,
} from "@/api/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@oedulms/ui/components/card";
import { Switch } from "@oedulms/ui/components/switch";
import { Button } from "@oedulms/ui/components/button";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import {
  Settings,
  ShieldAlert,
  CheckCircle,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  LogOut,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsComponent,
});

function parseUserAgent(ua: string | null | undefined) {
  if (!ua) return { browser: "Unknown Browser", os: "Unknown OS", isMobile: false };

  const uaLower = ua.toLowerCase();
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Detect OS
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macintosh")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";

  // Detect Browser
  if (uaLower.includes("edg/")) browser = "Edge";
  else if (uaLower.includes("chrome") && !uaLower.includes("chromium")) browser = "Chrome";
  else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
  else if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("opera") || uaLower.includes("opr/")) browser = "Opera";

  return { browser, os, isMobile: /mobile|android|iphone|ipad/i.test(uaLower) };
}

function IpLocation({ ip }: { ip: string | null }) {
  const [location, setLocation] = React.useState<string>("Resolving location...");

  React.useEffect(() => {
    if (!ip) {
      setLocation("Unknown Location");
      return;
    }
    if (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.16.") ||
      ip.startsWith("172.31.")
    ) {
      setLocation("Localhost / Private Network");
      return;
    }

    let isMounted = true;
    fetch(`https://ipapi.co/${ip}/json/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data && data.city && data.country_name) {
            setLocation(`${data.city}, ${data.country_name}`);
          } else {
            setLocation("Unknown Location");
          }
        }
      })
      .catch(() => {
        if (isMounted) setLocation("Unknown Location");
      });

    return () => {
      isMounted = false;
    };
  }, [ip]);

  return <span>{location}</span>;
}

function AdminSettingsComponent() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettingsMutation = useUpdateSystemSettings();

  const { data: currentSession } = authClient.useSession();
  const { data: sessionsData, isLoading: isLoadingSessions } = useActiveSessions();
  const sessions = sessionsData?.sessions;
  const currentLocation = sessionsData?.currentLocation;
  const revokeSessionMutation = useRevokeSession();

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

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync(sessionId);
      toast.success("Logged out device successfully.");
    } catch {
      toast.error("Failed to log out device.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse w-full">
        <div className="h-8 w-48 bg-muted/40 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="h-44 bg-muted/40 rounded-2xl w-full" />
          <div className="h-44 bg-muted/40 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  const allowStudentPosts = settings?.allowStudentPosts ?? true;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage general LMS preferences, social features, and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
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
                <span className="text-sm font-semibold text-foreground">
                  Allow Students to Post
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                  When enabled, students can create new posts and ask doubts on the community social
                  feed. When disabled, only teachers can post, but students can still read, like,
                  and comment.
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

        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Laptop className="size-5 text-primary" />
              <CardTitle className="text-base font-bold">Active Sessions & Devices</CardTitle>
            </div>
            <CardDescription className="text-xs pt-1">
              View and manage devices currently logged into your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-4">
            {isLoadingSessions ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No active sessions found.</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="flex flex-col divide-y divide-border/40">
                  {sessions.map((sess) => {
                    const isCurrent = sess.id === currentSession?.session?.id;
                    const { browser, os, isMobile } = parseUserAgent(sess.userAgent);
                    const DeviceIcon = isMobile ? Smartphone : Laptop;

                    return (
                      <div
                        key={sess.id}
                        className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted/60 border border-border/40 rounded-lg text-muted-foreground shrink-0 mt-0.5">
                            <DeviceIcon className="size-4" />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {browser} on {os}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 font-bold px-1.5 py-0.5 rounded-full">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                              {sess.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <Globe className="size-3" />
                                  {sess.ipAddress}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                {currentLocation &&
                                sess.ipAddress === currentLocation.ip &&
                                currentLocation.city &&
                                currentLocation.country ? (
                                  <span>
                                    {currentLocation.city}, {currentLocation.country} (Cloudflare CDN)
                                  </span>
                                ) : (
                                  <IpLocation ip={sess.ipAddress} />
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                Last active:{" "}
                                {new Date(sess.updatedAt || sess.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive hover:bg-destructive/5 cursor-pointer shrink-0 border border-destructive/20 hover:border-destructive/40"
                            onClick={() => handleRevokeSession(sess.id)}
                            disabled={revokeSessionMutation.isPending}
                          >
                            <LogOut className="size-3 mr-1" />
                            Log Out
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
