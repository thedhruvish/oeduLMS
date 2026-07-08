import * as React from "react";
import { GripVertical, ArrowUp, ArrowDown, Edit, Trash2, Plus, Film } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@oedulms/ui/components/card";
import { Button } from "@oedulms/ui/components/button";
import { Badge } from "@oedulms/ui/components/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Section, Lecture } from "@/api/curriculum";
import { LectureItem } from "./lecture-item";

interface SectionCardProps {
  section: Section;
  sIndex: number;
  sectionsCount: number;
  onMoveSection: (index: number, direction: "up" | "down") => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  deleteSectionPending: boolean;
  onAddLecture: (sectionId: string) => void;
  onEditLecture: (lecture: Lecture, sectionId: string) => void;
  onDeleteLecture: (sectionId: string, id: string) => void;
  onMoveLecture: (section: Section, index: number, direction: "up" | "down") => void;
  onDragEndLecture: (event: DragEndEvent, sectionId: string) => void;
}

export function SectionCard({
  section,
  sIndex,
  sectionsCount,
  onMoveSection,
  onEditSection,
  onDeleteSection,
  deleteSectionPending,
  onAddLecture,
  onEditLecture,
  onDeleteLecture,
  onMoveLecture,
  onDragEndLecture,
}: SectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-shadow ${isDragging ? "opacity-40 shadow-lg" : ""}`}
    >
      <Card className="border bg-card shadow-sm rounded-lg overflow-hidden flex flex-col gap-0 py-0 transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3 pt-4 px-4 bg-muted/10">
          <div className="flex items-center gap-2 min-w-0">
            <div
              {...attributes}
              {...listeners}
              onPointerDown={(e) => {
                e.stopPropagation();
                listeners?.onPointerDown?.(e);
              }}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary transition shrink-0 p-1 rounded hover:bg-muted"
            >
              <GripVertical className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  Section {sIndex + 1}
                </span>
                <Badge
                  variant={section.isPublished ? "default" : "secondary"}
                  className="text-[9px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wider shrink-0"
                >
                  {section.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground truncate max-w-md">
                {section.title}
              </CardTitle>
              {section.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {section.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 cursor-pointer"
              disabled={sIndex === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSection(sIndex, "up");
              }}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 cursor-pointer"
              disabled={sIndex === sectionsCount - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSection(sIndex, "down");
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
                onEditSection(section);
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
                onDeleteSection(section.id);
              }}
              disabled={deleteSectionPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex flex-col gap-3">
          {section.lectures.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-md bg-muted/5 flex flex-col items-center justify-center gap-1">
              <Film className="size-6 text-muted-foreground/60" />
              <span className="text-[11px] font-medium text-muted-foreground">
                No lectures added yet
              </span>
            </div>
          ) : (
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(e) => onDragEndLecture(e, section.id)}
            >
              <SortableContext
                items={section.lectures.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y border rounded-md bg-card overflow-hidden">
                  {section.lectures.map((lecture, lIndex) => (
                    <LectureItem
                      key={lecture.id}
                      lecture={lecture}
                      lIndex={lIndex}
                      section={section}
                      onEditLecture={onEditLecture}
                      onDeleteLecture={onDeleteLecture}
                      onMoveLecture={onMoveLecture}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <Button
            onClick={() => onAddLecture(section.id)}
            size="sm"
            variant="outline"
            className="w-fit mt-2 border-dashed bg-card"
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            Add Lecture
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
