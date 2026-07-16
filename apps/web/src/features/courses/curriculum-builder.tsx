import * as React from "react";
import { Film, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { curriculumKeys } from "@/api/query-keys";
import { Sortable, SortableItem } from "@oedulms/ui/components/reui/sortable";
import { Skeleton } from "@oedulms/ui/components/skeleton";

import { Button } from "@oedulms/ui/components/button";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import {
  useGetCurriculum,
  useDeleteSection,
  useUpdateLecture,
  useDeleteLecture,
  useReorderSections,
  useReorderLectures,
  type Section,
  type Lecture,
} from "@/api/curriculum";
import { SectionDialog } from "./section-dialog";
import { LectureSheet } from "./lecture-sheet";
import { SectionCard } from "./section-card";
import { useConfirm } from "@/store/confirm-store";

export interface CurriculumBuilderProps {
  courseId: string;
}

export interface CurriculumBuilderRef {
  openAddSection: () => void;
}

export const CurriculumBuilder = React.forwardRef<CurriculumBuilderRef, CurriculumBuilderProps>(
  ({ courseId }, ref) => {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const {
      data: sections = [],
      isLoading,
      isError,
      error,
      isFetching,
      refetch,
    } = useGetCurriculum(courseId);

    const deleteSection = useDeleteSection(courseId);
    const reorderSections = useReorderSections(courseId);

    const updateLecture = useUpdateLecture(courseId);
    const deleteLecture = useDeleteLecture(courseId);
    const reorderLectures = useReorderLectures(courseId);

    // Local state for Section dialogs
    const [sectionDialogOpen, setSectionDialogOpen] = React.useState(false);
    const [editingSection, setEditingSection] = React.useState<Section | null>(null);

    // Local state for Lecture dialogs
    const [lectureDialogOpen, setLectureDialogOpen] = React.useState(false);
    const [editingLecture, setEditingLecture] = React.useState<Lecture | null>(null);
    const [lectureSectionId, setLectureSectionId] = React.useState("");

    // Pending lecture ID ref to track S3 completion target
    const pendingLectureIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
      if (editingLecture) {
        pendingLectureIdRef.current = editingLecture.id;
      } else {
        pendingLectureIdRef.current = null;
      }
    }, [editingLecture]);

    const handleVideoUploadComplete = React.useCallback(
      async (url: string) => {
        if (pendingLectureIdRef.current) {
          try {
            await updateLecture.mutateAsync({
              sectionId: lectureSectionId,
              id: pendingLectureIdRef.current,
              values: { videoUrl: url },
            });
            toast.success("Lecture video updated in background!");
            refetch();
          } catch (err) {
            console.error("Failed to update lecture video in background:", err);
          }
        }
      },
      [lectureSectionId, updateLecture, refetch]
    );

    // Section CRUD
    const handleOpenAddSection = () => {
      setEditingSection(null);
      setSectionDialogOpen(true);
    };

    React.useImperativeHandle(ref, () => ({
      openAddSection: handleOpenAddSection,
    }));

    const handleOpenEditSection = (section: Section) => {
      setEditingSection(section);
      setSectionDialogOpen(true);
    };

    const handleDeleteSection = async (id: string) => {
      const isConfirmed = await confirm({
        title: "Delete Section?",
        desc: "Are you sure you want to delete this section? This will delete all lectures inside it.",
        destructive: true,
        confirmText: "Delete",
      });
      if (!isConfirmed) {
        return;
      }
      const toastId = toast.loading("Deleting section...");
      try {
        await deleteSection.mutateAsync(id);
        toast.success("Section deleted!", { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete section.";
        toast.error(msg, { id: toastId });
      }
    };

    // Section Drag handlers
    const handleSectionsReordered = async (updated: Section[]) => {
      // Sync update cache immediately to prevent drag snapback
      const queryKey = curriculumKeys.course(courseId);
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      queryClient.setQueryData<Section[]>(
        queryKey,
        updated.map((sec, idx) => ({ ...sec, position: idx }))
      );

      const orders = updated.map((sec, idx) => ({
        id: sec.id,
        position: idx,
      }));

      try {
        await reorderSections.mutateAsync(orders);
        toast.success("Sections reordered!");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to persist section order.";
        toast.error(msg);
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
      }
    };

    const handleMoveSection = async (index: number, direction: "up" | "down") => {
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= sections.length) return;

      const updated = [...sections];
      const [moved] = updated.splice(index, 1);
      updated.splice(swapIndex, 0, moved);

      const queryKey = curriculumKeys.course(courseId);
      const previous = queryClient.getQueryData<Section[]>(queryKey);

      // Optimistic update immediately
      queryClient.setQueryData<Section[]>(
        queryKey,
        updated.map((s, idx) => ({ ...s, position: idx }))
      );

      const orders = updated.map((s, idx) => ({ id: s.id, position: idx }));
      try {
        await reorderSections.mutateAsync(orders);
      } catch {
        toast.error("Failed to reorder sections.");
        if (previous) queryClient.setQueryData(queryKey, previous);
      }
    };

    // Lecture CRUD
    const handleOpenAddLecture = (sectionId: string) => {
      setLectureSectionId(sectionId);
      setEditingLecture(null);
      setLectureDialogOpen(true);
    };

    const handleOpenEditLecture = (lecture: Lecture, sectionId: string) => {
      setLectureSectionId(sectionId);
      setEditingLecture(lecture);
      setLectureDialogOpen(true);
    };

    const handleDeleteLecture = async (sectionId: string, id: string) => {
      const isConfirmed = await confirm({
        title: "Delete Lecture?",
        desc: "Are you sure you want to delete this lecture?",
        destructive: true,
        confirmText: "Delete",
      });
      if (!isConfirmed) {
        return;
      }
      const toastId = toast.loading("Deleting lecture...");
      try {
        await deleteLecture.mutateAsync({ sectionId, id });
        toast.success("Lecture deleted!", { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete lecture.";
        toast.error(msg, { id: toastId });
      }
    };

    // Lecture Drag handlers
    const handleLecturesReordered = async (sectionId: string, updatedLectures: Lecture[]) => {
      // Sync update cache immediately to prevent drag snapback
      const queryKey = curriculumKeys.course(courseId);
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      queryClient.setQueryData<Section[]>(
        queryKey,
        sections.map((s) => {
          if (s.id === sectionId) {
            return {
              ...s,
              lectures: updatedLectures.map((l, idx) => ({ ...l, position: idx })),
            };
          }
          return s;
        })
      );

      const orders = updatedLectures.map((l, idx) => ({
        id: l.id,
        position: idx,
      }));

      try {
        await reorderLectures.mutateAsync({ sectionId, orders });
        toast.success("Lectures reordered!");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to persist lecture order.";
        toast.error(msg);
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
      }
    };

    const handleMoveLecture = async (section: Section, index: number, direction: "up" | "down") => {
      const lectures = section.lectures;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= lectures.length) return;

      const updatedLectures = [...lectures];
      const [moved] = updatedLectures.splice(index, 1);
      updatedLectures.splice(swapIndex, 0, moved);

      const queryKey = curriculumKeys.course(courseId);
      const previous = queryClient.getQueryData<Section[]>(queryKey);

      // Optimistic update immediately
      queryClient.setQueryData<Section[]>(
        queryKey,
        sections.map((s) => {
          if (s.id === section.id) {
            return {
              ...s,
              lectures: updatedLectures.map((l, idx) => ({ ...l, position: idx })),
            };
          }
          return s;
        })
      );

      const orders = updatedLectures.map((l, idx) => ({ id: l.id, position: idx }));
      try {
        await reorderLectures.mutateAsync({ sectionId: section.id, orders });
      } catch {
        toast.error("Failed to reorder lectures.");
        if (previous) queryClient.setQueryData(queryKey, previous);
      }
    };

    if (isLoading) {
      return (
        <div className="flex flex-col gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              {/* Section header skeleton */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-b">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-4 rounded" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-4 w-44 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="size-7 rounded-md" />
                  ))}
                </div>
              </div>
              {/* Lecture rows skeleton */}
              <div className="divide-y">
                {[1, 2, 3].map((k) => (
                  <div key={k} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-3.5 rounded" />
                      <Skeleton className="w-7 h-5 rounded" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-3.5 w-40 rounded" />
                        <Skeleton className="h-2.5 w-20 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="size-7 rounded-md" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3">
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 gap-3 min-h-[300px] border rounded-lg bg-destructive/5 border-destructive/20 max-w-lg mx-auto my-8">
          <span className="text-sm text-destructive font-semibold">Failed to load curriculum</span>
          <p className="text-xs text-muted-foreground text-center">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred while fetching curriculum."}
          </p>
          <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col w-full h-full overflow-hidden relative">
          {sections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 bg-muted/5 min-h-[300px]">
              <Film className="size-10 text-muted-foreground mb-3" />
              <h4 className="text-sm font-semibold mb-1">No sections created yet</h4>
              <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                Curriculums are divided into course sections. Create your first section to start
                adding lectures.
              </p>
              <Button onClick={handleOpenAddSection} size="sm" variant="outline">
                Create First Section
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              <Sortable
                value={sections}
                onValueChange={handleSectionsReordered}
                getItemValue={(s) => s.id}
                strategy="vertical"
                className="space-y-6 pb-6"
              >
                {sections.map((section, sIndex) => (
                  <SortableItem key={section.id} value={section.id}>
                    <SectionCard
                      section={section}
                      sIndex={sIndex}
                      sectionsCount={sections.length}
                      onMoveSection={handleMoveSection}
                      onEditSection={handleOpenEditSection}
                      onDeleteSection={handleDeleteSection}
                      deleteSectionPending={deleteSection.isPending}
                      onAddLecture={handleOpenAddLecture}
                      onEditLecture={handleOpenEditLecture}
                      onDeleteLecture={handleDeleteLecture}
                      onMoveLecture={handleMoveLecture}
                      onDragEndLecture={handleLecturesReordered}
                    />
                  </SortableItem>
                ))}
              </Sortable>
            </ScrollArea>
          )}

          {/* Floating background sync loader */}
          {isFetching && !isLoading && (
            <div className="absolute bottom-4 right-4 bg-background border border-border rounded-full px-3 py-1 shadow-md flex items-center gap-2 z-50 text-[10px] text-muted-foreground font-medium animate-in fade-in slide-in-from-bottom-2">
              <Loader2 className="size-3 animate-spin text-primary" />
              <span>Syncing changes...</span>
            </div>
          )}
        </div>
        {/* Section Add/Edit Dialog Component */}
        {sectionDialogOpen && (
          <SectionDialog
            open={sectionDialogOpen}
            onOpenChange={setSectionDialogOpen}
            courseId={courseId}
            editingSection={editingSection}
          />
        )}

        {/* Lecture Add/Edit Sheet Component */}
        {lectureDialogOpen && (
          <LectureSheet
            open={lectureDialogOpen}
            onOpenChange={setLectureDialogOpen}
            courseId={courseId}
            sectionId={lectureSectionId}
            editingLecture={editingLecture}
            onSuccess={(newId) => {
              if (newId) pendingLectureIdRef.current = newId;
            }}
            onVideoUploadComplete={handleVideoUploadComplete}
          />
        )}
      </>
    );
  }
);

CurriculumBuilder.displayName = "CurriculumBuilder";
