import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@oedulms/ui/lib/utils";
import type { PlayerSection } from "@/api/course-player";
import { TruncatedTitle } from "./truncated-title";
import { CurriculumLectureItem } from "./curriculum-lecture-item";

interface CurriculumSectionProps {
  section: PlayerSection;
  activeLectureId: string | undefined;
  defaultOpen?: boolean;
  onSelectLecture: (lectureId: string) => void;
}

export function CurriculumSection({
  section,
  activeLectureId,
  defaultOpen = false,
  onSelectLecture,
}: CurriculumSectionProps) {
  const hasActive = section.lectures.some((l) => l.id === activeLectureId);
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActive);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={isOpen}
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <TruncatedTitle
            title={section.title}
            className="text-xs font-semibold text-foreground"
            as="h3"
          />
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            {section.watchedVideos}/{section.totalVideos} watched
          </span>
        </div>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col pb-1">
          {section.lectures.map((lecture, idx) => (
            <CurriculumLectureItem
              key={lecture.id}
              lecture={lecture}
              index={idx}
              isActive={lecture.id === activeLectureId}
              onSelect={onSelectLecture}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
