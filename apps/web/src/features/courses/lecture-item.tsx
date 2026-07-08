import * as React from "react";
import { GripVertical, Film, ArrowUp, ArrowDown, Edit, Trash2 } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Section, Lecture } from "@/api/curriculum";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lecture.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-shadow ${isDragging ? "opacity-30 bg-muted/30 shadow-sm" : ""}`}
    >
      <div className="flex items-center justify-between p-3 hover:bg-muted/10 transition">
        <div className="flex items-center gap-2 min-w-0">
          <div
            {...attributes}
            {...listeners}
            onPointerDown={(e) => {
              e.stopPropagation();
              listeners?.onPointerDown?.(e);
            }}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-primary transition p-0.5 rounded hover:bg-muted shrink-0 mr-1.5"
          >
            <GripVertical className="size-3.5" />
          </div>
          <Film className="size-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate max-w-md">
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
                className={`px-1.5 py-px rounded font-semibold text-[9px] uppercase tracking-wider ${lecture.isPublished ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
              >
                {lecture.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
    </div>
  );
}
