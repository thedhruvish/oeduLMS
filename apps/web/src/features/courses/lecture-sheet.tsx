import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { lectureSchema, type LectureInput } from "@oedulms/validator/courses";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@oedulms/ui/components/sheet";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import { Field, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Switch } from "@oedulms/ui/components/switch";
import { Button } from "@oedulms/ui/components/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/ui/form-error";
import { MediaUploader } from "@/components/ui/media-uploader";
import { DurationEstimator } from "@/features/courses/course-form";
import { useCreateLecture, useUpdateLecture, type Lecture } from "@/api/curriculum";

interface LectureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sectionId: string;
  editingLecture: Lecture | null;
  onSuccess?: (newId?: string) => void;
  onVideoUploadComplete?: (url: string) => void;
}

export function LectureSheet({
  open,
  onOpenChange,
  courseId,
  sectionId,
  editingLecture,
  onSuccess,
  onVideoUploadComplete,
}: LectureSheetProps) {
  const createLecture = useCreateLecture(courseId);
  const updateLecture = useUpdateLecture(courseId);

  const lectureForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      thumbnail: "",
      duration: 0,
      isPreview: false,
      isPublished: false,
    } as LectureInput,
    validators: {
      onChange: lectureSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        title: value.title,
        description: value.description || null,
        videoUrl: value.videoUrl || null,
        thumbnail: value.thumbnail || null,
        duration: value.duration,
        isPreview: value.isPreview,
        isPublished: value.isPublished,
      };

      try {
        if (editingLecture) {
          await updateLecture.mutateAsync({
            sectionId,
            id: editingLecture.id,
            values: payload,
          });
          toast.success("Lecture updated successfully!");
          if (onSuccess) onSuccess();
        } else {
          const newLec = await createLecture.mutateAsync({
            sectionId,
            values: payload,
          });
          toast.success("Lecture created successfully!");
          if (onSuccess) onSuccess(newLec.id);
        }
        onOpenChange(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save lecture.";
        toast.error(msg);
      }
    },
  });

  React.useEffect(() => {
    if (open) {
      lectureForm.reset({
        title: editingLecture?.title || "",
        description: editingLecture?.description || "",
        videoUrl: editingLecture?.videoUrl || "",
        thumbnail: editingLecture?.thumbnail || "",
        duration: editingLecture?.duration || 0,
        isPreview: editingLecture?.isPreview || false,
        isPublished: editingLecture?.isPublished || false,
      });
    }
  }, [open, editingLecture]);

  const isPending = createLecture.isPending || updateLecture.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md h-full flex flex-col p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <SheetTitle>{editingLecture ? "Edit Lecture" : "Add Lecture"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
          <form
            id="lecture-form"
            onSubmit={(e) => {
              e.preventDefault();
              lectureForm.handleSubmit();
            }}
            className="flex flex-col gap-4 py-4"
          >
            <lectureForm.Field name="title">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Lecture Title</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g. Intro to Course Overview"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </lectureForm.Field>

            <lectureForm.Field name="description">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description (Optional)</FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      placeholder="Details of the lecture..."
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      rows={3}
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </lectureForm.Field>

            <div className="grid grid-cols-2 gap-4">
              <lectureForm.Field name="duration">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <FieldLabel htmlFor={field.name} className="!mb-0">
                          Duration (sec)
                        </FieldLabel>
                        <DurationEstimator
                          currentSeconds={field.state.value}
                          onApply={(val) => field.handleChange(val)}
                        />
                      </div>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        aria-invalid={isInvalid}
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </lectureForm.Field>

              <div className="flex flex-col gap-4 border rounded-lg p-4 bg-muted/10 mt-6">
                <lectureForm.Field name="isPreview">
                  {(field) => (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-semibold text-foreground select-none cursor-pointer"
                        >
                          Free Preview
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          Allow students to watch this lecture without purchasing the course.
                        </span>
                      </div>
                      <Switch
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(checked)}
                      />
                    </div>
                  )}
                </lectureForm.Field>

                <div className="h-px bg-border" />

                <lectureForm.Field name="isPublished">
                  {(field) => (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <label
                          htmlFor={field.name}
                          className="text-xs font-semibold text-foreground select-none cursor-pointer"
                        >
                          Publish Lecture
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          Make this lecture visible to enrolled students.
                        </span>
                      </div>
                      <Switch
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(checked)}
                      />
                    </div>
                  )}
                </lectureForm.Field>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <lectureForm.Field name="videoUrl">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Lecture Video</FieldLabel>
                      <MediaUploader
                        value={field.state.value || ""}
                        onChange={(url) => {
                          field.handleChange(url);
                          if (onVideoUploadComplete) onVideoUploadComplete(url);
                        }}
                        acceptType="video"
                        directory="videos"
                        backgroundUpload={true}
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </lectureForm.Field>

              <lectureForm.Field name="thumbnail">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Lecture Thumbnail</FieldLabel>
                      <MediaUploader
                        value={field.state.value || ""}
                        onChange={(url) => field.handleChange(url)}
                        acceptType="image"
                        directory="thumbnails"
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </lectureForm.Field>
            </div>
          </form>
        </ScrollArea>
        <SheetFooter className="p-6 border-t flex flex-row justify-end gap-2 shrink-0 bg-muted/10">
          <SheetClose render={<Button type="button" variant="outline" />}>Cancel</SheetClose>
          <Button type="submit" form="lecture-form" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {editingLecture ? "Save Changes" : "Create Lecture"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
