import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { type SectionInput } from "@oedulms/validator/courses";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@oedulms/ui/components/dialog";
import { Field, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Button } from "@oedulms/ui/components/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/ui/form-error";
import { useCreateSection, useUpdateSection, type Section } from "@/api/curriculum";
import { cn } from "@oedulms/ui/lib/utils";
import { DatePickerTime } from "@/components/ui/date-picker-time";

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  editingSection: Section | null;
  onSuccess?: () => void;
}

export function SectionDialog({
  open,
  onOpenChange,
  courseId,
  editingSection,
  onSuccess,
}: SectionDialogProps) {
  const createSection = useCreateSection(courseId);
  const updateSection = useUpdateSection(courseId);

  const sectionForm = useForm({
    formId: editingSection ? `edit-section-${editingSection.id}` : "create-section",
    defaultValues: {
      title: editingSection?.title || "",
      description: editingSection?.description || "",
      publishMode: editingSection?.publishMode || "AFTER_TRANSCODE",
      publishedAt:
        editingSection?.publishedAt || (editingSection ? null : new Date().toISOString()),
    } as SectionInput,
    onSubmit: async ({ value }) => {
      if (!value.title || value.title.trim().length < 3) {
        toast.error("Title must be at least 3 characters");
        return;
      }
      try {
        const payload: SectionInput = {
          title: value.title,
          description: value.description || null,
          publishMode: value.publishMode,
          publishedAt:
            value.publishMode === "AFTER_TRANSCODE"
              ? value.publishedAt || new Date().toISOString()
              : value.publishMode === "DRAFT"
                ? null
                : value.publishedAt || null,
        };

        if (editingSection) {
          await updateSection.mutateAsync({
            id: editingSection.id,
            values: payload,
          });
          toast.success("Section updated successfully!");
        } else {
          await createSection.mutateAsync(payload);
          toast.success("Section created successfully!");
        }
        if (onSuccess) onSuccess();
        onOpenChange(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save section.";
        toast.error(msg);
      }
    },
  });

  React.useEffect(() => {
    if (open) {
      sectionForm.reset();
    }
  }, [open, editingSection, sectionForm]);

  const isPending = createSection.isPending || updateSection.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sectionForm.handleSubmit();
          }}
          className="flex flex-col gap-4 py-2"
        >
          <sectionForm.Field
            name="title"
            validators={{
              onBlur: ({ value }) => {
                if (!value || value.trim().length < 3) {
                  return "Title must be at least 3 characters";
                }
              },
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Section Title</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g. Chapter 1: Foundations"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                </Field>
              );
            }}
          </sectionForm.Field>

          <sectionForm.Field name="description">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Description (Optional)</FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    placeholder="Briefly describe the topics covered in this section..."
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
          </sectionForm.Field>

          <sectionForm.Field name="publishMode">
            {(fieldMode) => {
              const publishMode = fieldMode.state.value;

              return (
                <sectionForm.Field name="publishedAt">
                  {(fieldDate) => {
                    const publishedAt = fieldDate.state.value;

                    return (
                      <div className="flex flex-col gap-3 border rounded-lg p-4 bg-muted/10">
                        <label className="text-xs font-semibold text-foreground">
                          Publish Options
                        </label>
                        <div className="flex flex-col gap-2">
                          <div
                            className={cn(
                              "flex items-center gap-3 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/10 transition",
                              publishMode === "AFTER_TRANSCODE" && "border-primary bg-primary/5"
                            )}
                            onClick={() => {
                              fieldMode.handleChange("AFTER_TRANSCODE");
                              fieldDate.handleChange(new Date().toISOString());
                            }}
                          >
                            <div className="size-3.5 rounded-full border border-primary flex items-center justify-center shrink-0">
                              {publishMode === "AFTER_TRANSCODE" && (
                                <div className="size-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold">Publish Immediately</span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-3 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/10 transition",
                              publishMode === "DRAFT" && "border-primary bg-primary/5"
                            )}
                            onClick={() => {
                              fieldMode.handleChange("DRAFT");
                              fieldDate.handleChange(null);
                            }}
                          >
                            <div className="size-3.5 rounded-full border border-primary flex items-center justify-center shrink-0">
                              {publishMode === "DRAFT" && (
                                <div className="size-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold">Keep as Draft</span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-3 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/10 transition",
                              publishMode === "SCHEDULED" && "border-primary bg-primary/5"
                            )}
                            onClick={() => {
                              fieldMode.handleChange("SCHEDULED");
                              if (!publishedAt) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                tomorrow.setHours(10, 30, 0, 0);
                                fieldDate.handleChange(tomorrow.toISOString());
                              }
                            }}
                          >
                            <div className="size-3.5 rounded-full border border-primary flex items-center justify-center shrink-0">
                              {publishMode === "SCHEDULED" && (
                                <div className="size-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold">Schedule Section</span>
                            </div>
                          </div>
                        </div>

                        {publishMode === "SCHEDULED" && (
                          <div className="flex flex-col mt-1 animate-in fade-in duration-200">
                            <DatePickerTime
                              value={publishedAt}
                              onChange={(val) => fieldDate.handleChange(val)}
                              idPrefix="section-picker"
                            />
                          </div>
                        )}
                      </div>
                    );
                  }}
                </sectionForm.Field>
              );
            }}
          </sectionForm.Field>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {editingSection ? "Save Changes" : "Create Section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
