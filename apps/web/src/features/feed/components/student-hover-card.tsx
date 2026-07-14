import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useUserProfile } from "@/api/profile";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@oedulms/ui/components/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Skeleton } from "@oedulms/ui/components/skeleton";
import { MapPin } from "lucide-react";
import { getInitials } from "@/lib/helper";

interface StudentHoverCardProps {
  userId: string;
  userName: string;
  userImage?: string | null;
  children: React.ReactNode;
}

export function StudentHoverCard({ userId, userName, userImage, children }: StudentHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger render={<div className="cursor-pointer shrink-0 rounded-full" />}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4 border border-border/60 bg-popover shadow-xl rounded-(--radius-xl) duration-200">
        <HoverCardContentInner userId={userId} userName={userName} userImage={userImage} />
      </HoverCardContent>
    </HoverCard>
  );
}

function HoverCardContentInner({
  userId,
  userName,
  userImage,
}: {
  userId: string;
  userName: string;
  userImage?: string | null;
}) {
  const { data, isLoading, error } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5 select-none text-left">
        {/* Upper row: Avatar & View Profile Button (Pre-rendered) */}
        <div className="flex items-start justify-between gap-4">
          <Link to="/profile/$userId" params={{ userId }}>
            <Avatar className="size-14 border border-border/50 hover:opacity-90 transition">
              {userImage ? <AvatarImage src={userImage} alt={userName} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link to="/profile/$userId" params={{ userId }}>
            <button className="text-[11px] font-bold border border-border/80 hover:bg-muted text-foreground px-3 py-1.5 rounded-full transition cursor-pointer">
              View Profile
            </button>
          </Link>
        </div>

        {/* Info Row: Name & Headline (Headline is skeleton) */}
        <div className="flex flex-col gap-2">
          <Link
            to="/profile/$userId"
            params={{ userId }}
            className="hover:underline font-extrabold text-sm text-foreground leading-tight"
          >
            {userName}
          </Link>
          <Skeleton className="h-3 w-40 mt-0.5" />
        </div>

        {/* Bio Text Skeleton */}
        <div className="flex flex-col gap-1.5 mt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2 p-1 text-center">
        <span className="font-semibold text-xs text-destructive">Failed to load profile</span>
        <span className="text-[10px] text-muted-foreground">Please try again later.</span>
      </div>
    );
  }

  const profileUser = data.user;
  const profileDetails = data.profile;

  return (
    <div className="flex flex-col gap-3.5 select-none text-left">
      {/* Upper row: Avatar & View Profile Button */}
      <div className="flex items-start justify-between gap-4">
        <Link to="/profile/$userId" params={{ userId }}>
          <Avatar className="size-14 border border-border/50 hover:opacity-90 transition">
            {profileUser.image ? (
              <AvatarImage src={profileUser.image} alt={profileUser.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {getInitials(profileUser.name)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <Link to="/profile/$userId" params={{ userId }}>
          <button className="text-[11px] font-bold border border-border/80 hover:bg-muted text-foreground px-3 py-1.5 rounded-full transition cursor-pointer">
            View Profile
          </button>
        </Link>
      </div>

      {/* Info Row: Name & Headline */}
      <div className="flex flex-col">
        <Link
          to="/profile/$userId"
          params={{ userId }}
          className="hover:underline font-extrabold text-sm text-foreground leading-tight"
        >
          {profileUser.name}
        </Link>
        {profileDetails?.headline ? (
          <span className="text-[11px] text-muted-foreground font-medium mt-0.5 leading-snug">
            {profileDetails.headline}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/60 italic mt-0.5">Student</span>
        )}
      </div>

      {/* Bio text snippet */}
      {profileDetails?.bio && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {profileDetails.bio}
        </p>
      )}

      {/* Footer Meta: Location */}
      {profileDetails?.country && (
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border/30 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-muted-foreground/60" />
            <span>{profileDetails.country}</span>
          </div>
        </div>
      )}
    </div>
  );
}
