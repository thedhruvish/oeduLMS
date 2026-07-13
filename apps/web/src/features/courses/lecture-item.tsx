import * as React from "react";
import { GripVertical, Film, ArrowUp, ArrowDown, Edit, Trash2 } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { SortableItemHandle } from "@oedulms/ui/components/reui/sortable";
import type { Section, Lecture } from "@/api/curriculum";
import { cn } from "@oedulms/ui/lib/utils";

interface LectureItemProps {
  lecture: Lecture;
  lIndex: number;
  section: Section;
  onEditLecture: (lecture: Lecture, sectionId: string) => void;
  onDeleteLecture: (sectionId: string, id: string) => void;
  onMoveLecture: (section: Section, index: number, direction: "up" | "down") => void;
}

export function LectureItem({
  lecture,
  lIndex,
  section,
  onEditLecture,
  onDeleteLecture,
  onMoveLecture,
}: LectureItemProps) {
  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-muted/10 transition gap-3">
      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
        <SortableItemHandle className="text-muted-foreground/50 hover:text-primary transition p-0.5 rounded hover:bg-muted shrink-0 mr-1.5">
          <GripVertical className="size-3.5" />
        </SortableItemHandle>
        {lecture.thumbnail ? (
          <img
            src={lecture.thumbnail}
            alt=""
            className="w-7 h-5 rounded object-cover shrink-0 border bg-muted"
          />
        ) : (
          <Film className="size-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex flex-col min-w-0 w-full">
          <span className="text-xs font-semibold text-foreground truncate max-w-full">
            {lecture.title}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            {lecture.duration > 0 && <span>{formatDuration(lecture.duration)}</span>}
            {lecture.isPreview && (
              <span className="px-1 py-px bg-primary/10 text-primary rounded font-medium">
                Preview
              </span>
            )}
            <span
              className={cn(
                "px-1.5 py-px rounded font-semibold text-[9px] uppercase tracking-wider",
                lecture.publishedAt
                  ? new Date(lecture.publishedAt) > new Date()
                  : "bg-muted text-muted-foreground"
              )}
            >
              {lecture.publishedAt
                ? new Date(lecture.publishedAt) > new Date()
                  ? "Scheduled"
                  : "Published"
                : "Draft"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end sm:justify-start flex-wrap">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 cursor-pointer"
          disabled={lIndex === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMoveLecture(section, lIndex, "up");
          }}
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 cursor-pointer"
          disabled={lIndex === section.lectures.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMoveLecture(section, lIndex, "down");
          }}
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:bg-muted cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onEditLecture(lecture, section.id);
          }}
        >
          <Edit className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteLecture(section.id, lecture.id);
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
