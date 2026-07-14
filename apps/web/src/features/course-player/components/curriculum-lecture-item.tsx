import { CheckCircle2, Circle, Play } from "lucide-react";
import { cn } from "@oedulms/ui/lib/utils";
import type { PlayerLecture } from "@/api/course-player";
import { formatDuration } from "../utils";
import { TruncatedTitle } from "./truncated-title";

interface CurriculumLectureItemProps {
  lecture: PlayerLecture;
  index: number;
  isActive: boolean;
  onSelect: (lectureId: string) => void;
}

export function CurriculumLectureItem({
  lecture,
  index,
  isActive,
  onSelect,
}: CurriculumLectureItemProps) {
  const isCompleted = lecture.progress.completed;

  return (
    <button
      type="button"
      onClick={() => onSelect(lecture.id)}
      className={cn(
        "group flex w-full items-start gap-2.5 rounded-none px-3 py-2.5 text-left transition-colors",
        isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-foreground/90"
      )}
      aria-current={isActive ? "true" : undefined}
    >
      <span className="mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="size-4 text-primary" />
        ) : isActive ? (
          <Play className="size-4 fill-primary text-primary" />
        ) : (
          <Circle className="size-4 text-muted-foreground/50" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground tabular-nums">
            {index + 1}.
          </span>
          <TruncatedTitle
            title={lecture.title}
            className={cn("text-xs font-medium leading-snug", isActive && "text-primary")}
          />
        </div>
        <span className="pl-4 text-[10px] text-muted-foreground tabular-nums">
          {formatDuration(lecture.duration)}
        </span>
      </div>
    </button>
  );
}
