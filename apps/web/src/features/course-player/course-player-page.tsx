import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { Skeleton } from "@oedulms/ui/components/skeleton";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@oedulms/ui/components/sheet";
import { cn } from "@oedulms/ui/lib/utils";
import {
  useCoursePlayer,
  useUpdateLectureProgress,
  useUserSettings,
  useUpdateUserSettings,
  type PlayerLecture,
  type PlayerSection,
} from "@/api/course-player";
import { PlayerTopBar } from "./components/player-top-bar";
import { LectureVideoArea } from "./components/lecture-video-area";
import { CurriculumSidebar } from "./components/curriculum-sidebar";
import { LectureTabsPanel } from "./components/lecture-tabs-panel";

interface CoursePlayerPageProps {
  courseId: string;
  lectureId?: string;
}

function flattenLectures(sections: PlayerSection[]): PlayerLecture[] {
  return sections.flatMap((s) => s.lectures);
}

function findLecture(
  sections: PlayerSection[],
  lectureId: string | undefined
): PlayerLecture | undefined {
  if (!lectureId) return undefined;
  for (const section of sections) {
    const found = section.lectures.find((l) => l.id === lectureId);
    if (found) return found;
  }
  return undefined;
}

/** Simple hook to check if we're at least at a given breakpoint (SSR-safe). */
function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = React.useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint
  );
  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}

export function CoursePlayerPage({ courseId, lectureId }: CoursePlayerPageProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useCoursePlayer(courseId);
  const updateProgress = useUpdateLectureProgress(courseId);
  const { data: userSettings, isLoading: isLoadingSettings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const isDesktop = useIsDesktop();

  const [searchQuery, setSearchQuery] = React.useState("");
  // Desktop sidebar open/close
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  // Mobile sheet open/close (separate from desktop)
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

  const allLectures = React.useMemo(() => (data ? flattenLectures(data.sections) : []), [data]);

  // Resolve active lecture: query param → settings.lastWatchedLectures[courseId] → last watched (latest progress.updatedAt) → first incomplete → first lecture
  const activeLecture = React.useMemo(() => {
    if (!data) return undefined;
    const fromParam = findLecture(data.sections, lectureId);
    if (fromParam) return fromParam;

    // Try finding by last watched lecture from settings cache
    if (userSettings?.lastWatchedLectures?.[courseId]) {
      const settingsLecture = findLecture(
        data.sections,
        userSettings.lastWatchedLectures[courseId]
      );
      if (settingsLecture) return settingsLecture;
    }

    // Find the lecture with the most recent progress updates
    const sortedProgressLectures = [...allLectures]
      .filter((l) => l.progress.updatedAt)
      .sort((a, b) => {
        const timeA = new Date(a.progress.updatedAt!).getTime();
        const timeB = new Date(b.progress.updatedAt!).getTime();
        return timeB - timeA; // Descending (most recent first)
      });
    if (sortedProgressLectures.length > 0) return sortedProgressLectures[0];

    const firstIncomplete = allLectures.find((l) => !l.progress.completed);
    return firstIncomplete ?? allLectures[0];
  }, [data, lectureId, allLectures, userSettings, courseId]);

  // Save last watched lecture to user settings in DB
  const lastSavedLectureRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!activeLecture || !userSettings) return;
    if (lastSavedLectureRef.current === activeLecture.id) return;

    if (userSettings.lastWatchedLectures?.[courseId] === activeLecture.id) {
      lastSavedLectureRef.current = activeLecture.id;
      return;
    }

    lastSavedLectureRef.current = activeLecture.id;
    updateSettings.mutate({
      lastWatchedLectures: {
        ...(userSettings.lastWatchedLectures || {}),
        [courseId]: activeLecture.id,
      },
    });
  }, [activeLecture, userSettings, courseId, updateSettings]);

  // Sync URL when lecture missing or invalid
  React.useEffect(() => {
    if (!data || !activeLecture) return;
    if (lectureId === activeLecture.id) return;

    navigate({
      to: "/dash/courses/$courseId",
      params: { courseId },
      search: { lecture: activeLecture.id },
      replace: true,
    });
  }, [data, activeLecture, lectureId, courseId, navigate]);

  const activeIndex = activeLecture ? allLectures.findIndex((l) => l.id === activeLecture.id) : -1;

  const markLectureComplete = React.useCallback(
    (lecture: PlayerLecture | undefined) => {
      if (!lecture || lecture.progress.completed) return;
      updateProgress.mutate({
        lectureId: lecture.id,
        completed: true,
        watchSeconds: Math.max(lecture.progress.watchSeconds, lecture.duration || 1),
        lastPosition: lecture.duration || 0,
      });
    },
    [updateProgress]
  );

  const handleProgressUpdate = React.useCallback(
    (currentTime: number, duration: number) => {
      if (!activeLecture) return;

      const isNearEnd = duration > 0 && duration - currentTime < 5;
      const completed = activeLecture.progress.completed || isNearEnd;

      updateProgress.mutate({
        lectureId: activeLecture.id,
        lastPosition: Math.round(currentTime),
        watchSeconds: Math.round(Math.max(activeLecture.progress.watchSeconds, currentTime)),
        completed,
      });
    },
    [activeLecture, updateProgress]
  );

  const selectLecture = React.useCallback(
    (id: string) => {
      navigate({
        to: "/dash/courses/$courseId",
        params: { courseId },
        search: { lecture: id },
      });
    },
    [navigate, courseId]
  );

  const goNext = React.useCallback(() => {
    if (activeIndex < 0 || activeIndex >= allLectures.length - 1) return;
    markLectureComplete(activeLecture);
    const next = allLectures[activeIndex + 1];
    if (next) selectLecture(next.id);
  }, [activeIndex, allLectures, selectLecture, activeLecture, markLectureComplete]);

  const goPrev = React.useCallback(() => {
    if (activeIndex <= 0) return;
    const prev = allLectures[activeIndex - 1];
    if (prev) selectLecture(prev.id);
  }, [activeIndex, allLectures, selectLecture]);

  // Unified toggle: on mobile opens sheet, on desktop toggles sidebar
  const handleToggleSidebar = React.useCallback(() => {
    if (isDesktop) {
      setSidebarOpen((p) => !p);
    } else {
      setMobileSheetOpen((p) => !p);
    }
  }, [isDesktop]);

  if (isLoading) {
    return (
      <div className="flex h-dvh flex-col bg-background text-foreground">
        {/* Header */}
        <div className="flex h-14 items-center gap-3 border-b px-4 shrink-0">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="ml-auto h-8 w-56 rounded-md" />
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content (Player & Tabs) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="w-full shrink-0 bg-muted/20">
              <Skeleton className="w-full rounded-none" style={{ height: "min(56.25vw, 60dvh)" }} />
            </div>
            <div className="flex-1 overflow-auto">
              <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 flex flex-col gap-4">
                <Skeleton className="h-8 w-64 rounded-md" />
                <div className="border-b border-border pb-px flex gap-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Sidebar Skeleton */}
          <div className="hidden lg:flex flex-col shrink-0 border-l border-border lg:w-96 xl:w-[420px] bg-card">
            <div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <div className="flex flex-1 flex-col gap-5 p-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  <Skeleton className="h-5 w-48" />
                  <div className="flex flex-col gap-2 pl-4">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-8 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const message =
      status === 403
        ? "You are not enrolled in this course."
        : status === 404
          ? "Course not found."
          : "Failed to load the course player.";

    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Unable to open course</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/dash/courses" })}>
            Back to courses
          </Button>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const isTvMode = isDesktop && !sidebarOpen;

  const topBarSidebarOpen = isDesktop ? sidebarOpen : mobileSheetOpen;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <PlayerTopBar
        courseTitle={data.course.title}
        lectureTitle={activeLecture?.title}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sidebarOpen={topBarSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Main column — both video and tabs scroll together ── */}
        <ScrollArea className="flex-1 min-w-0">
          <div className="flex flex-col">
            {activeLecture && (
              <div
                className="w-full shrink-0 overflow-hidden bg-black"
                style={{ height: "min(56.25vw, 60dvh)" }}
              >
                <LectureVideoArea
                  videoUrl={activeLecture?.videoUrl}
                  hlsUrl={activeLecture.hlsUrl}
                  poster={activeLecture?.thumbnail ?? data.course.thumbnail}
                  isTvMode={isTvMode}
                  onNext={
                    activeIndex >= 0 && activeIndex < allLectures.length - 1 ? goNext : undefined
                  }
                  onPrev={activeIndex > 0 ? goPrev : undefined}
                  initialTime={activeLecture?.progress?.lastPosition || 0}
                  onProgressUpdate={handleProgressUpdate}
                  initialPlaybackRate={
                    userSettings
                      ? parseFloat(userSettings.playbackSpeed)
                      : isLoadingSettings
                        ? undefined
                        : 1.0
                  }
                  onPlaybackRateChange={(rate) =>
                    updateSettings.mutate({ playbackSpeed: String(rate) })
                  }
                />
              </div>
            )}

            {/* Tabs panel (comments, overview, etc.) */}
            <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6">
              {activeLecture ? (
                <LectureTabsPanel courseId={data.course.id} lecture={activeLecture} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This course has no published lectures yet.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* ── Desktop sidebar (lg+) — slides in/out with width transition ── */}
        <div
          className={cn(
            "hidden shrink-0 overflow-hidden border-l border-border",
            "transition-[width] duration-300 ease-in-out",
            "lg:flex lg:flex-col",
            sidebarOpen ? "lg:!w-96 xl:!w-[420px]" : "lg:!w-0"
          )}
          aria-hidden={!sidebarOpen}
        >
          {/* Keep mounted so transition is smooth; aria-hidden prevents interaction when closed */}
          <CurriculumSidebar
            sections={data.sections}
            activeLectureId={activeLecture?.id}
            searchQuery={searchQuery}
            stats={data.stats}
            onSelectLecture={selectLecture}
          />
        </div>
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="right" className="flex  !w-[90vw] !max-w-sm !sm:max-w-md flex-col p-0">
          <SheetTitle className="sr-only">Course curriculum</SheetTitle>
          <CurriculumSidebar
            sections={data.sections}
            activeLectureId={activeLecture?.id}
            searchQuery={searchQuery}
            stats={data.stats}
            onSelectLecture={(id) => {
              selectLecture(id);
              setMobileSheetOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
