import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { Input } from "@oedulms/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@oedulms/ui/components/tooltip";
import { TruncatedTitle } from "./truncated-title";

interface PlayerTopBarProps {
  courseTitle: string;
  lectureTitle?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function PlayerTopBar({
  courseTitle,
  lectureTitle,
  searchQuery,
  onSearchChange,
  sidebarOpen,
  onToggleSidebar,
}: PlayerTopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur-md md:px-4">
      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: "/dash/courses" })}
                aria-label="Back to courses"
              />
            }
          >
            <ArrowLeft />
          </TooltipTrigger>
          <TooltipContent>Back to courses</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <TruncatedTitle
          title={courseTitle}
          className="text-sm font-semibold text-foreground"
          as="h1"
        />
        {lectureTitle ? (
          <TruncatedTitle title={lectureTitle} className="text-xs text-muted-foreground" as="p" />
        ) : null}
      </div>

      <div className="relative hidden w-full max-w-xs sm:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search sections & lectures..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8"
          aria-label="Search curriculum"
        />
      </div>

      {/* Mobile search */}
      <div className="relative w-full max-w-[9rem] sm:hidden">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-7"
          aria-label="Search curriculum"
        />
      </div>

      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                aria-label={sidebarOpen ? "Hide curriculum sidebar" : "Show curriculum sidebar"}
                aria-pressed={sidebarOpen}
              />
            }
          >
            {sidebarOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </TooltipTrigger>
          <TooltipContent>{sidebarOpen ? "Hide sidebar (TV mode)" : "Show sidebar"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}
