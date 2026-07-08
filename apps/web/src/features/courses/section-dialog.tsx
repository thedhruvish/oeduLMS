import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { sectionSchema, type SectionInput } from "@oedulms/validator/courses";
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
import { Switch } from "@oedulms/ui/components/switch";
import { Button } from "@oedulms/ui/components/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/ui/form-error";
import { useCreateSection, useUpdateSection, type Section } from "@/api/curriculum";

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
    defaultValues: {
      title: "",
      description: "",
      isPublished: false,
    } as SectionInput,
    validators: {
      onChange: sectionSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (editingSection) {
          await updateSection.mutateAsync({
            id: editingSection.id,
            values: value,
          });
          toast.success("Section updated successfully!");
        } else {
          await createSection.mutateAsync(value);
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
      sectionForm.reset({
        title: editingSection?.title || "",
        description: editingSection?.description || "",
        isPublished: editingSection?.isPublished || false,
      });
    }
  }, [open, editingSection]);

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
          <sectionForm.Field name="title">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
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

          <sectionForm.Field name="isPublished">
            {(field) => (
              <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor={field.name}
                    className="text-xs font-semibold text-foreground select-none cursor-pointer"
                  >
                    Publish Section
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Make this section visible to students immediately.
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
