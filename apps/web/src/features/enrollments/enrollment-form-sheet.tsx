import * as React from "react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { Button } from "@oedulms/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@oedulms/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@oedulms/ui/components/sheet";
import { Spinner } from "@oedulms/ui/components/spinner";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";

import { useCreateEnrollment } from "@/api/enrollments";
import { useCourses } from "@/api/courses";
import { useStudents } from "@/api/students";
import { FormError } from "@/components/ui/form-error";
import { enrollmentSchema } from "@oedulms/validator";

interface EnrollmentFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnrollmentFormValues = z.input<typeof enrollmentSchema>;

export function EnrollmentFormSheet({ open, onOpenChange }: EnrollmentFormSheetProps) {
  const { data: courses = [] } = useCourses();
  const { data: students = [] } = useStudents();
  const createMutation = useCreateEnrollment();

  const form = useForm({
    defaultValues: {
      studentId: "",
      courseId: "",
      status: "active",
    } as EnrollmentFormValues,
    validators: {
      onChange: enrollmentSchema,
    },
    onSubmit: async ({ value }) => {
      if (!value.studentId || !value.courseId) {
        toast.error("Please select a student and a course.");
        return;
      }
      try {
        await createMutation.mutateAsync({
          studentId: value.studentId,
          courseId: value.courseId,
          status: value.status || "active",
        });
        toast.success("Student successfully enrolled in course.");
        onOpenChange(false);
      } catch (err: unknown) {
        let errorMsg = "Failed to enroll student.";
        if (err && typeof err === "object" && "response" in err) {
          const resObj = (err as { response?: { data?: { error?: string } } }).response;
          if (resObj?.data?.error) {
            errorMsg = resObj.data.error;
          }
        }
        toast.error(errorMsg);
      }
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        studentId: "",
        courseId: "",
        status: "active",
      } as EnrollmentFormValues);
    }
  }, [open]);

  const isPending = createMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col h-full font-sans"
        >
          <SheetHeader>
            <SheetTitle>Enroll Student</SheetTitle>
            <SheetDescription>Manually enroll a student in a course catalog item.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-5 px-4 pb-6 mt-4">
            <FieldGroup>
              {/* Student */}
              <form.Field name="studentId">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Student *</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val || "")}
                      >
                        <SelectTrigger className="bg-card w-full">
                          <SelectValue placeholder="Select student..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} ({student.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              {/* Course */}
              <form.Field name="courseId">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Course *</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val || "")}
                      >
                        <SelectTrigger className="bg-card w-full">
                          <SelectValue placeholder="Select course..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              {/* Status */}
              <form.Field name="status">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) =>
                        field.handleChange(val as "active" | "completed" | "refunded")
                      }
                    >
                      <SelectTrigger className="bg-card w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </div>

          <SheetFooter className="border-t bg-muted/10 p-4 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
              Enroll Student
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
