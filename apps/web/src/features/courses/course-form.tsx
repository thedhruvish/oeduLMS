import { useForm } from "@tanstack/react-form";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Upload,
  Link2,
} from "lucide-react";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@oedulms/ui/lib/utils";

import { courseSchema, type CourseInput, type FaqInput } from "@oedulms/validator";
import { Field, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Button } from "@oedulms/ui/components/button";
import { Checkbox } from "@oedulms/ui/components/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@oedulms/ui/components/select";
import { FormError } from "@/components/ui/form-error";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Card, CardHeader, CardTitle, CardContent } from "@oedulms/ui/components/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from "@oedulms/ui/components/popover";
import { MediaUploader } from "@/components/ui/media-uploader";

interface CourseFormProps {
  defaultValues?: CourseInput;
  onSubmit: (values: CourseInput) => Promise<void>;
  isPending: boolean;
  submitLabel?: string;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

const DEFAULT_VALUES: CourseInput = {
  title: "",
  shortDescription: "",
  description: "",
  price: 0,
  discountPrice: null,
  currency: "USD",
  thumbnail: "",
  trailerVideo: "",
  durationSeconds: 0,
  totalLectures: 0,
  certificateEnabled: false,
  status: "DRAFT",
  language: "",
  validateDays: null,
  faqs: [],
};

export interface DurationEstimatorProps {
  onApply: (seconds: number) => void;
  currentSeconds: number;
}

export function DurationEstimator({ onApply, currentSeconds }: DurationEstimatorProps) {
  const currentHours = Math.floor(currentSeconds / 3600);
  const currentMins = Math.floor((currentSeconds % 3600) / 60);

  const [hours, setHours] = React.useState(currentHours);
  const [mins, setMins] = React.useState(currentMins);

  React.useEffect(() => {
    setHours(Math.floor(currentSeconds / 3600));
    setMins(Math.floor((currentSeconds % 3600) / 60));
  }, [currentSeconds]);

  const handleApply = () => {
    const totalSeconds = hours * 3600 + mins * 60;
    onApply(totalSeconds);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition p-0.5 rounded flex items-center justify-center"
            title="Estimate from Hours/Minutes"
          />
        }
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3 flex flex-col gap-3">
        <PopoverTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Duration Estimator
        </PopoverTitle>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Hours</label>
            <Input
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Minutes</label>
            <Input
              type="number"
              min="0"
              max="59"
              value={mins}
              onChange={(e) => setMins(Math.max(0, Math.min(59, Number(e.target.value))))}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground italic">
          Calculates to: {(hours * 3600 + mins * 60).toLocaleString()} seconds
        </div>
        <Button type="button" size="sm" onClick={handleApply} className="w-full text-xs h-7">
          Apply Estimate
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function LecturesInfo() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition p-0.5 rounded flex items-center justify-center"
          />
        }
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <PopoverTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Lectures Info
        </PopoverTitle>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Provide an estimated number of total lectures. This helps set student expectations in the
          course brochure.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function CourseForm({
  defaultValues = DEFAULT_VALUES,
  onSubmit,
  isPending,
  formRef,
}: CourseFormProps) {
  const [faqOpen, setFaqOpen] = React.useState(true);
  const [videoSource, setVideoSource] = React.useState<"upload" | "link">(() => {
    const url = defaultValues.trailerVideo || "";
    if (url && !url.includes("/trailers/")) {
      return "link";
    }
    return "upload";
  });

  React.useEffect(() => {
    const url = defaultValues.trailerVideo || "";
    if (url && !url.includes("/trailers/")) {
      setVideoSource("link");
    } else {
      setVideoSource("upload");
    }
  }, [defaultValues.trailerVideo]);

  const form = useForm({
    defaultValues,
    validators: { onChange: courseSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col w-full h-full overflow-hidden"
    >
      <ScrollArea className="w-full pr-3 flex-1" style={{ height: "100%" }}>
        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pb-8">
          {/* LEFT: Content details (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Title */}
            <form.Field name="title">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Course Title *</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="e.g. Introduction to React"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isPending}
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Short Description */}
            <form.Field name="shortDescription">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Short Description</FieldLabel>
                    <Textarea
                      id={field.name}
                      placeholder="Summarize this course in 2-3 sentences..."
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isPending}
                      rows={3}
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Full Description */}
            <form.Field name="description">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Full Description</FieldLabel>
                    <RichTextEditor
                      value={field.state.value || ""}
                      onChange={(html) => field.handleChange(html)}
                      disabled={isPending}
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Thumbnail Image */}
            <form.Field name="thumbnail">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="max-w-md">
                    <FieldLabel htmlFor={field.name}>Thumbnail Image</FieldLabel>
                    <MediaUploader
                      value={field.state.value}
                      onChange={(url) => field.handleChange(url)}
                      acceptType="image"
                      directory="thumbnails"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Trailer Video */}
            <form.Field name="trailerVideo">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="max-w-md">
                    <FieldLabel htmlFor={field.name}>Trailer Video</FieldLabel>

                    <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 border border-border rounded-lg w-full max-w-[280px] mb-3">
                      <button
                        type="button"
                        onClick={() => setVideoSource("upload")}
                        className={cn(
                          "text-xs font-semibold py-1.5 px-3 rounded-md transition duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                          videoSource === "upload"
                            ? "bg-background text-foreground shadow-sm font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Upload className="size-3.5" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoSource("link")}
                        className={cn(
                          "text-xs font-semibold py-1.5 px-3 rounded-md transition duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                          videoSource === "link"
                            ? "bg-background text-foreground shadow-sm font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Link2 className="size-3.5" />
                        <span>Direct Link</span>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {videoSource === "upload" ? (
                        <motion.div
                          key="upload"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <MediaUploader
                            value={field.state.value}
                            onChange={(url) => field.handleChange(url)}
                            acceptType="video"
                            directory="trailers"
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="link"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-2"
                        >
                          <Input
                            id={field.name}
                            name={field.name}
                            placeholder="Enter direct video URL (e.g. https://domain.com/video.mp4)"
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={isPending}
                          />
                          {field.state.value && (
                            <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-video flex items-center justify-center">
                              <video
                                src={field.state.value}
                                controls
                                className="size-full bg-black object-contain"
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>
          </div>

          {/* RIGHT: Settings sidebar (1/3 width) */}
          <div className="flex flex-col gap-5 p-5 border rounded-lg bg-card sticky top-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-3">
              Course Settings
            </h3>

            {/* Status */}
            <form.Field name="status">
              {(field) => (
                <Field>
                  <FieldLabel>Publishing Status</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as CourseInput["status"])}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-3">
              {/* Price */}
              <form.Field name="price">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Price ($)</FieldLabel>
                      <Input
                        id={field.name}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="29.99"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        disabled={isPending}
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              {/* Discount Price */}
              <form.Field name="discountPrice">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Discount ($)</FieldLabel>
                      <Input
                        id={field.name}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="19.99"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value ? Number(e.target.value) : null)
                        }
                        disabled={isPending}
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Currency */}
              <form.Field name="currency">
                {(field) => (
                  <Field>
                    <FieldLabel>Currency</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v || "USD")}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>

              {/* Language */}
              <form.Field name="language">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Language</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="English"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isPending}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Duration Seconds */}
              <form.Field name="durationSeconds">
                {(field) => (
                  <Field>
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
                      type="number"
                      min="0"
                      placeholder="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      disabled={isPending}
                    />
                  </Field>
                )}
              </form.Field>

              {/* Total Lectures */}
              <form.Field name="totalLectures">
                {(field) => (
                  <Field>
                    <div className="flex items-center gap-1.5 mb-1">
                      <FieldLabel htmlFor={field.name} className="!mb-0">
                        Lectures Count
                      </FieldLabel>
                      <LecturesInfo />
                    </div>
                    <Input
                      id={field.name}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      disabled={isPending}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            {/* Validate Days */}
            <form.Field name="validateDays">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Access Duration (Days)</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    placeholder="Empty = Lifetime access"
                    value={field.state.value || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={isPending}
                  />
                </Field>
              )}
            </form.Field>

            {/* Certificate Enabled */}
            <form.Field name="certificateEnabled">
              {(field) => (
                <div className="flex items-center gap-2.5 py-1.5 px-1">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(!!checked)}
                    disabled={isPending}
                  />
                  <label
                    htmlFor={field.name}
                    className="text-xs font-semibold text-foreground leading-none select-none cursor-pointer"
                  >
                    Enable Certificate
                  </label>
                </div>
              )}
            </form.Field>
          </div>
        </div>

        {/* ── FAQ Section (full width below) ── */}

        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition text-left"
            onClick={() => setFaqOpen((o) => !o)}
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              <HelpCircle className="size-4 text-primary" />
              Frequently Asked Questions (FAQs)
            </div>
            {faqOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>

          {faqOpen && (
            <div className="p-4 flex flex-col gap-4">
              <form.Field name="faqs">
                {(field) => {
                  const faqs: FaqInput[] = (field.state.value as FaqInput[]) || [];

                  const addFaq = () => {
                    field.handleChange([...faqs, { question: "", answer: "" }]);
                  };

                  const removeFaq = (index: number) => {
                    field.handleChange(faqs.filter((_, i) => i !== index));
                  };

                  const updateFaq = (index: number, key: keyof FaqInput, value: string) => {
                    const updated = faqs.map((faq, i) =>
                      i === index ? { ...faq, [key]: value } : faq
                    );
                    field.handleChange(updated);
                  };

                  return (
                    <div className="flex flex-col gap-4">
                      {faqs.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No FAQs added yet. Click below to add one.
                        </p>
                      )}

                      {faqs.map((faq, index) => (
                        <Card
                          key={index}
                          className="border bg-card shadow-sm rounded-lg overflow-hidden flex flex-col gap-0 py-0"
                        >
                          <CardHeader className="flex flex-row items-center justify-between border-b pb-3 pt-4 px-4 bg-muted/10">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              FAQ #{index + 1}
                            </CardTitle>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:bg-destructive/10"
                              onClick={() => removeFaq(index)}
                              disabled={isPending}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-4 flex flex-col gap-4">
                            <Field>
                              <FieldLabel>Question</FieldLabel>
                              <Input
                                placeholder="e.g. Is this course for beginners?"
                                value={faq.question}
                                onChange={(e) => updateFaq(index, "question", e.target.value)}
                                disabled={isPending}
                              />
                            </Field>

                            <Field>
                              <FieldLabel>Answer</FieldLabel>
                              <Textarea
                                placeholder="e.g. Yes, this course starts from the very basics..."
                                value={faq.answer}
                                onChange={(e) => updateFaq(index, "answer", e.target.value)}
                                rows={3}
                                disabled={isPending}
                              />
                            </Field>
                          </CardContent>
                        </Card>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFaq}
                        disabled={isPending}
                        className="w-fit"
                      >
                        <Plus className="size-4" data-icon="inline-start" />
                        Add FAQ
                      </Button>
                    </div>
                  );
                }}
              </form.Field>
            </div>
          )}
        </div>
      </ScrollArea>
    </form>
  );
}
