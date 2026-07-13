import * as React from "react";
import { CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";

import { Button } from "@oedulms/ui/components/button";
import { Input } from "@oedulms/ui/components/input";
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
import { Separator } from "@oedulms/ui/components/separator";
import { Switch } from "@oedulms/ui/components/switch";
import { Spinner } from "@oedulms/ui/components/spinner";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";

import { z } from "zod";
import { couponSchema } from "@oedulms/validator";
import { useCreateCoupon, useUpdateCoupon, type Coupon } from "@/api/coupons";
import { useCourses } from "@/api/courses";
import { DatePickerTime } from "@/components/ui/date-picker-time";
import { FormError } from "@/components/ui/form-error";

interface CouponFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCoupon: Coupon | null;
}

type CouponFormValues = z.input<typeof couponSchema>;

export function CouponFormSheet({ open, onOpenChange, editingCoupon }: CouponFormSheetProps) {
  const { data: courses = [] } = useCourses();
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();

  const form = useForm({
    defaultValues: {
      code: "",
      name: "",
      description: "",
      discountType: "PERCENTAGE",
      discountValue: 0,
      maxDiscount: null,
      minimumAmount: null,
      startAt: null,
      expiresAt: null,
      usageLimit: null,
      isActive: true,
      courseIds: [] as string[],
    } as CouponFormValues,
    validators: {
      onChange: couponSchema,
    },
    onSubmit: async ({ value }) => {
      if (!value.code || !value.name || value.discountValue === 0) {
        toast.error("Please fill in all required fields.");
        return;
      }

      if (value.discountType === "PERCENTAGE" && Number(value.discountValue) > 100) {
        toast.error("Percentage discount cannot exceed 100%");
        return;
      }

      const payload = {
        code: value.code.trim().toUpperCase(),
        name: value.name.trim(),
        description: value.description?.trim() || null,
        discountType: value.discountType,
        discountValue: Number(value.discountValue),
        maxDiscount: value.maxDiscount !== null ? Number(value.maxDiscount) : null,
        minimumAmount: value.minimumAmount !== null ? Number(value.minimumAmount) : null,
        startAt: value.startAt || null,
        expiresAt: value.expiresAt || null,
        usageLimit: value.usageLimit !== null ? Number(value.usageLimit) : null,
        isActive: value.isActive ?? true,
        courseIds: value.courseIds || [],
      };

      try {
        if (editingCoupon) {
          await updateMutation.mutateAsync({ id: editingCoupon.id, payload });
          toast.success(`Coupon ${payload.code} updated successfully.`);
        } else {
          await createMutation.mutateAsync(payload);
          toast.success(`Coupon ${payload.code} created successfully.`);
        }
        onOpenChange(false);
      } catch (err: unknown) {
        let errorMsg = "Failed to save coupon.";
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

  // Reset form values on open or change of edit coupon
  React.useEffect(() => {
    if (open) {
      form.reset(
        editingCoupon
          ? ({
              code: editingCoupon.code,
              name: editingCoupon.name,
              description: editingCoupon.description || "",
              discountType: editingCoupon.discountType,
              discountValue: editingCoupon.discountValue,
              maxDiscount: editingCoupon.maxDiscount ?? null,
              minimumAmount: editingCoupon.minimumAmount ?? null,
              startAt: editingCoupon.startAt || null,
              expiresAt: editingCoupon.expiresAt || null,
              usageLimit: editingCoupon.usageLimit ?? null,
              isActive: editingCoupon.isActive,
              courseIds: editingCoupon.courseIds || [],
            } as CouponFormValues)
          : ({
              code: "",
              name: "",
              description: "",
              discountType: "PERCENTAGE",
              discountValue: 0,
              maxDiscount: null,
              minimumAmount: null,
              startAt: null,
              expiresAt: null,
              usageLimit: null,
              isActive: true,
              courseIds: [],
            } as CouponFormValues)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCoupon, open]);

  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <SheetTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</SheetTitle>
            <SheetDescription>
              Configure discount settings and course restrictions.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-5 px-4 pb-6 mt-4">
            <FieldGroup>
              {/* Code */}
              <form.Field name="code">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Coupon Code *</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="e.g. SUMMER50"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                        aria-invalid={isInvalid}
                        className="bg-card w-full font-mono uppercase"
                        required
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              {/* Name */}
              <form.Field name="name">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Campaign Name *</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="e.g. Summer Seasonal Discount"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        className="bg-card w-full"
                        required
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              {/* Description */}
              <form.Field name="description">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="E.g. 50% discount for summer catalog promotion"
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        className="bg-card w-full"
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>

            <Separator />

            {/* Discount Value Config */}
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="discountType">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Discount Type *</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => {
                        field.handleChange(val as "PERCENTAGE" | "FIXED");
                        form.setFieldValue("discountValue", 0);
                      }}
                    >
                      <SelectTrigger className="bg-card w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>

              <form.Field name="discountValue">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  const currentDiscountType = form.getFieldValue("discountType");
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Discount Value * ({currentDiscountType === "PERCENTAGE" ? "%" : "₹"})
                      </FieldLabel>
                      <Input
                        type="number"
                        id={field.name}
                        name={field.name}
                        min="1"
                        max={currentDiscountType === "PERCENTAGE" ? 100 : undefined}
                        placeholder={currentDiscountType === "PERCENTAGE" ? "50" : "150.00"}
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value !== "" ? Number(e.target.value) : 0)
                        }
                        aria-invalid={isInvalid}
                        className="bg-card w-full"
                        required
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            {/* Max Discount & Min Spend */}
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="maxDiscount">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  const currentDiscountType = form.getFieldValue("discountType");
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Max Discount (₹) {currentDiscountType === "PERCENTAGE" ? "" : "(Disabled)"}
                      </FieldLabel>
                      <Input
                        type="number"
                        id={field.name}
                        name={field.name}
                        min="0"
                        placeholder="E.g. 500"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value !== "" ? Number(e.target.value) : null)
                        }
                        className="bg-card w-full"
                        disabled={currentDiscountType === "FIXED"}
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="minimumAmount">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Min. Spend (₹)</FieldLabel>
                      <Input
                        type="number"
                        id={field.name}
                        name={field.name}
                        min="0"
                        placeholder="E.g. 200"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value !== "" ? Number(e.target.value) : null)
                        }
                        className="bg-card w-full"
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            <Separator />

            {/* Validity Limits (Improved Date Pickers) */}
            <div className="flex flex-col gap-4">
              <form.Field name="startAt">
                {(field) => (
                  <DatePickerTime
                    value={field.state.value}
                    onChange={(val) => field.handleChange(val)}
                    dateLabel="Start Date"
                    timeLabel="Start Time"
                    idPrefix="start-at"
                  />
                )}
              </form.Field>

              <form.Field name="expiresAt">
                {(field) => (
                  <DatePickerTime
                    value={field.state.value}
                    onChange={(val) => field.handleChange(val)}
                    dateLabel="Expiry Date"
                    timeLabel="Expiry Time"
                    idPrefix="expires-at"
                  />
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <form.Field name="usageLimit">
                {(field) => {
                  const isInvalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Usage Limit (Max Uses)</FieldLabel>
                      <Input
                        type="number"
                        id={field.name}
                        name={field.name}
                        min="1"
                        placeholder="E.g. 100"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value !== "" ? Number(e.target.value) : null)
                        }
                        className="bg-card w-full"
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="isActive">
                {(field) => (
                  <div className="flex items-center gap-3 pt-5 select-none">
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                      id="coupon-active-switch"
                    />
                    <label
                      htmlFor="coupon-active-switch"
                      className="text-xs font-semibold text-foreground cursor-pointer"
                    >
                      Status: {field.state.value ? "Active" : "Inactive"}
                    </label>
                  </div>
                )}
              </form.Field>
            </div>

            <Separator />

            {/* Restricted Courses Select Area */}
            <form.Field name="courseIds">
              {(field) => {
                const selectedList = field.state.value || [];
                return (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Course Restrictions (Select to Restrict, leave blank for Global)
                    </label>
                    <div className="border rounded-md max-h-40 overflow-y-auto p-2 bg-muted/20 flex flex-col gap-1">
                      {courses.map((course) => {
                        const checked = selectedList.includes(course.id);
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const updated = checked
                                ? selectedList.filter((id) => id !== course.id)
                                : [...selectedList, course.id];
                              field.handleChange(updated);
                            }}
                            className="flex items-center gap-2 p-1 text-left text-xs rounded hover:bg-muted/40 transition select-none cursor-pointer"
                          >
                            {checked ? (
                              <CheckSquare className="size-4 text-primary shrink-0" />
                            ) : (
                              <Square className="size-4 text-muted-foreground/60 shrink-0" />
                            )}
                            <span className="truncate text-foreground font-medium">
                              {course.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            </form.Field>
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
              {editingCoupon ? "Save Changes" : "Create Coupon"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
