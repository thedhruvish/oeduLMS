import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useUserProfile } from "@/api/profile";
import { Card, CardHeader, CardTitle, CardContent } from "@oedulms/ui/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Button } from "@oedulms/ui/components/button";
import { Navbar } from "@/components/navbar";
import { MapPin, ArrowLeft } from "lucide-react";
import { getInitials } from "@/lib/helper";

export const Route = createFileRoute("/profile/$userId")({
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const { data, isLoading, error } = useUserProfile(userId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-24 pb-12 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="rounded-(--radius-lg)"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        </div>

        {isLoading ? (
          <div className="w-full h-80 bg-muted/40 rounded-(--radius-xl) animate-pulse" />
        ) : error || !data ? (
          <Card className="border border-destructive/20 bg-destructive/5 text-destructive p-8 rounded-(--radius-xl) text-center">
            <h2 className="text-lg font-bold">User Not Found</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The requested user profile does not exist or you do not have permission to view it.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Main Profile Info Card */}
            <Card className="border border-border/50 shadow-md p-6 md:p-8 rounded-(--radius-xl) flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              <Avatar className="size-32 border-2 border-primary/20 shadow-lg shrink-0">
                {data.user.image ? (
                  <AvatarImage src={data.user.image} alt={data.user.name} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-4xl">
                  {getInitials(data.user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <h1 className="text-3xl font-extrabold tracking-tight">{data.user.name}</h1>
                  <span className="text-xs text-primary font-semibold uppercase tracking-wider px-3 py-1 bg-primary/10 rounded-full self-center md:self-start">
                    Student Profile
                  </span>
                </div>

                {data.profile?.headline ? (
                  <p className="text-lg text-muted-foreground font-medium">
                    {data.profile.headline}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/75 italic">No headline provided</p>
                )}

                {data.profile?.country && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-muted-foreground/80" />
                      <span>{data.profile.country}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Biography Details Card */}
            <Card className="border border-border/50 shadow-sm rounded-(--radius-xl)">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold">
                  About {data.user.name.split(" ")[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {data.profile?.bio ? (
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {data.profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No biography shared yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
