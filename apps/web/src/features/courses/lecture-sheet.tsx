import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "@tanstack/react-form";
import { LectureInput } from "@oedulms/validator/courses";
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

import {
  Loader2,
  Trash2,
  Paperclip,
  Upload,
  Sliders,
  Settings,
  Download,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/ui/form-error";
import { MediaUploader } from "@/components/ui/media-uploader";
import { useConfirm } from "@/store/confirm-store";
import { useCreateLecture, useUpdateLecture, type Lecture } from "@/api/curriculum";
import { useGetVideoStatus } from "@/api/video";
import { uploadFileToS3 } from "@/api/media";
import { cn } from "@oedulms/ui/lib/utils";

import { DatePickerTime } from "@/components/ui/date-picker-time";

const allQualityOptions = [
  { value: "144p", label: "144p" },
  { value: "240p", label: "240p" },
  { value: "360p", label: "360p" },
  { value: "480p", label: "480p (SD)" },
  { value: "540p", label: "540p" },
  { value: "720p", label: "720p" },
  { value: "900p", label: "900p" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "1440p", label: "1440p (2K)" },
  { value: "2160p", label: "2160p (4K)" },
  { value: "4320p", label: "4320p (8K)" },
];

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
  const confirm = useConfirm();

  const [qualityMode, setQualityMode] = React.useState<"recommend" | "advanced">("recommend");
  const [videoSource, setVideoSource] = React.useState<"upload" | "link">(() => {
    const url = editingLecture?.videoUrl || "";
    if (url && !url.includes("/videos/")) {
      return "link";
    }
    return "upload";
  });
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false);
  const [attachmentProgress, setAttachmentProgress] = React.useState<number | null>(null);

  const { data: pipelineStatus } = useGetVideoStatus(
    editingLecture?.id,
    !!editingLecture && !!editingLecture.videoUrl
  );

  const lectureForm = useForm({
    formId: editingLecture ? `edit-lecture-${editingLecture.id}` : "create-lecture",
    defaultValues: {
      title: editingLecture?.title || "",
      description: editingLecture?.description || "",
      videoUrl: editingLecture?.videoUrl || "",
      thumbnail: editingLecture?.thumbnail || "",
      isPreview: editingLecture?.isPreview || false,
      publishMode: editingLecture?.publishMode || "AFTER_TRANSCODE",
      publishedAt:
        editingLecture?.publishedAt || (editingLecture ? null : new Date().toISOString()),
      qualities: editingLecture?.qualities || ["360p", "720p", "1080p"],
      resources: editingLecture?.resources || [],
      duration: editingLecture?.duration || 0,
    } as LectureInput,
    onSubmit: async ({ value }) => {
      if (!value.title || value.title.trim().length < 3) {
        toast.error("Title must be at least 3 characters");
        return;
      }
      const payload: LectureInput = {
        title: value.title,
        description: value.description || null,
        videoUrl: value.videoUrl || null,
        thumbnail: value.thumbnail || null,
        isPreview: value.isPreview,
        publishMode: value.publishMode,
        publishedAt:
          value.publishMode === "AFTER_TRANSCODE"
            ? value.publishedAt || new Date().toISOString()
            : value.publishMode === "DRAFT"
              ? null
              : value.publishedAt || null,
        qualities: value.qualities || [],
        resources: value.resources || [],
        duration: value.duration ?? 0,
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
      lectureForm.reset();
      const isRec = editingLecture?.qualities
        ? JSON.stringify([...editingLecture.qualities].sort()) ===
          JSON.stringify(["360p", "720p", "1080p"].sort())
        : true;
      setQualityMode(isRec ? "recommend" : "advanced");

      const url = editingLecture?.videoUrl || "";
      if (url && !url.includes("/videos/")) {
        setVideoSource("link");
      } else {
        setVideoSource("upload");
      }
    }
  }, [open, editingLecture, lectureForm]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    setAttachmentProgress(0);

    try {
      const res = await uploadFileToS3(file, "attachments", (pct) => {
        setAttachmentProgress(pct);
      });

      const currentResources = lectureForm.getFieldValue("resources") || [];
      const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
      const newResource = {
        title: file.name,
        url: res.fileUrl,
        type: ext,
        size: file.size,
      };

      lectureForm.setFieldValue("resources", [...currentResources, newResource]);
      toast.success("Attachment uploaded successfully!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to upload attachment.";
      toast.error(msg);
    } finally {
      setIsUploadingAttachment(false);
      setAttachmentProgress(null);
      e.target.value = ""; // Reset file input
    }
  };

  const removeAttachment = async (index: number) => {
    const isConfirmed = await confirm({
      title: "Remove Attachment?",
      desc: "Are you sure you want to remove this attachment?",
      destructive: true,
      confirmText: "Remove",
    });
    if (!isConfirmed) {
      return;
    }
    const currentResources = lectureForm.getFieldValue("resources") || [];
    const updated = currentResources.filter((_, i) => i !== index);
    lectureForm.setFieldValue("resources", updated);
  };

  const isPending = createLecture.isPending || updateLecture.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!w-1/2 !max-w-none h-[90%] flex flex-col">
        {" "}
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6"
          >
            {/* Left Column: Core Metadata & Media */}
            <div className="flex flex-col gap-4">
              <lectureForm.Field
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
                        rows={4}
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

              <lectureForm.Field name="videoUrl">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Lecture Video</FieldLabel>

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
                              value={field.state.value || ""}
                              maxSize={100 * 1024 * 1024 * 1024} // 100GB
                              onChange={(url) => {
                                field.handleChange(url);
                                if (onVideoUploadComplete) onVideoUploadComplete(url);
                              }}
                              acceptType="video"
                              directory="videos"
                              backgroundUpload={true}
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
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />

                      {pipelineStatus && (
                        <div className="mt-3 p-3 border rounded-lg bg-muted/20 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Transcoding Status:</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold",
                              pipelineStatus.status === "READY" && "bg-green-500/10 text-green-500 border border-green-500/20",
                              pipelineStatus.status === "ERROR" && "bg-destructive/10 text-destructive border border-destructive/20",
                              (pipelineStatus.status === "SPLITTING" || pipelineStatus.status === "ENCODING") && "bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse",
                              pipelineStatus.status === "UPLOADING" && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                            )}>
                              {pipelineStatus.status === "READY" ? "READY / PLAYABLE" : pipelineStatus.status}
                            </span>
                          </div>

                          {(pipelineStatus.status === "SPLITTING" || pipelineStatus.status === "ENCODING") && (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="h-1.5 w-full bg-muted border border-border rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                                  style={{ width: `${pipelineStatus.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground self-end font-semibold">
                                {pipelineStatus.progress}% Transcoded
                              </span>
                            </div>
                          )}

                          {pipelineStatus.status === "READY" && (
                            <span className="text-[10px] text-green-500 font-medium">
                              ✓ Adaptive HLS stream generated successfully.
                            </span>
                          )}

                          {pipelineStatus.status === "ERROR" && (
                            <span className="text-[10px] text-destructive font-medium">
                              ⚠ Error: {pipelineStatus.errorMessage || "Transcoding failed."}
                            </span>
                          )}
                        </div>
                      )}
                    </Field>
                  );
                }}
              </lectureForm.Field>
            </div>

            {/* Right Column: Settings, Qualities, Attachments & Publishing */}
            <div className="flex flex-col gap-6">
              {/* Settings Group */}
              <div className="border rounded-lg p-4 bg-muted/10 flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Settings className="size-3.5" />
                  General Settings
                </h4>

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
              </div>

              {/* Qualities Section */}
              <div className="border rounded-lg p-4 bg-muted/10 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="size-3.5" />
                    Video Qualities
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    Select the resolutions that will be processed for this video lecture.
                  </span>
                </div>

                <div className="flex gap-2 p-1 border rounded-lg bg-muted/40 w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setQualityMode("recommend");
                      lectureForm.setFieldValue("qualities", ["360p", "720p", "1080p"]);
                    }}
                    className={cn(
                      "text-xs font-medium px-3 py-1 rounded-md transition cursor-pointer",
                      qualityMode === "recommend"
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Recommended
                  </button>
                  <button
                    type="button"
                    onClick={() => setQualityMode("advanced")}
                    className={cn(
                      "text-xs font-medium px-3 py-1 rounded-md transition cursor-pointer",
                      qualityMode === "advanced"
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Advanced Custom
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {qualityMode === "recommend" ? (
                    <motion.div
                      key="recommend"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-background/50 border rounded-lg p-3 text-xs flex flex-col gap-1.5">
                        <span className="font-semibold text-muted-foreground text-[10px] uppercase">
                          Default Resolutions
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {["360p", "720p", "1080p"].map((q) => (
                            <span
                              key={q}
                              className="px-2 py-0.5 bg-primary/10 text-primary font-semibold text-[10px] rounded-full"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="advanced"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <lectureForm.Field name="qualities">
                        {(field) => {
                          const selectedQualities = field.state.value || [];

                          const handleToggleQuality = (val: string) => {
                            const isChecked = selectedQualities.includes(val);
                            if (isChecked) {
                              field.handleChange(
                                selectedQualities.filter((q: string) => q !== val)
                              );
                            } else {
                              field.handleChange([...selectedQualities, val]);
                            }
                          };

                          return (
                            <div className="flex flex-wrap gap-1.5 bg-background/50 border rounded-lg p-3">
                              {allQualityOptions.map((opt) => {
                                const isChecked = selectedQualities.includes(opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleToggleQuality(opt.value)}
                                    className={cn(
                                      "text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer select-none",
                                      isChecked
                                        ? "bg-primary/10 text-primary border-primary/30"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }}
                      </lectureForm.Field>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Attachments Section */}
              <div className="border rounded-lg p-4 bg-muted/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="size-3.5" />
                    Lecture Attachments
                  </h4>
                  <label
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition cursor-pointer select-none",
                      isUploadingAttachment && "pointer-events-none opacity-50"
                    )}
                  >
                    {isUploadingAttachment ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Uploading... {attachmentProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-3" />
                        <span>Add File</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                      disabled={isUploadingAttachment}
                    />
                  </label>
                </div>

                <lectureForm.Field name="resources">
                  {(field) => {
                    const currentResources = field.state.value || [];

                    if (currentResources.length === 0) {
                      return (
                        <div className="text-center py-4 border border-dashed rounded-lg bg-background/30 text-[10px] text-muted-foreground">
                          No attachments uploaded yet.
                        </div>
                      );
                    }

                    const formatSize = (bytes?: number | null) => {
                      if (!bytes) return "0 KB";
                      const kb = bytes / 1024;
                      if (kb < 1024) return `${kb.toFixed(1)} KB`;
                      const mb = kb / 1024;
                      return `${mb.toFixed(1)} MB`;
                    };

                    return (
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                        {currentResources.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 border rounded-lg bg-background/50 hover:bg-background/80 transition text-xs"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0 mr-2">
                              <span className="font-medium truncate max-w-[240px] text-foreground">
                                {att.title}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {formatSize(att.size)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {att.url && (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center justify-center size-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                                  title="Download attachment"
                                >
                                  <Download className="size-3.5" />
                                </a>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-6 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                                onClick={() => removeAttachment(idx)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                </lectureForm.Field>
              </div>

              {/* Publish Options Section */}
              <div className="border rounded-lg p-4 bg-muted/10 flex flex-col gap-4">
                <lectureForm.Field name="publishMode">
                  {(fieldMode) => {
                    const publishMode = fieldMode.state.value;

                    return (
                      <lectureForm.Field name="publishedAt">
                        {(fieldDate) => {
                          const publishedAt = fieldDate.state.value;

                          return (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-foreground">
                                  Publish Options
                                </label>
                                <div className="flex flex-col gap-2">
                                  <div
                                    className={cn(
                                      "flex items-start gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/10 transition",
                                      publishMode === "AFTER_TRANSCODE" &&
                                        "border-primary bg-primary/5"
                                    )}
                                    onClick={() => {
                                      fieldMode.handleChange("AFTER_TRANSCODE");
                                      fieldDate.handleChange(new Date().toISOString());
                                    }}
                                  >
                                    <div className="size-4 rounded-full border border-primary flex items-center justify-center shrink-0 mt-0.5">
                                      {publishMode === "AFTER_TRANSCODE" && (
                                        <div className="size-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-semibold">
                                        Publish Automatically (Once video finishes processing)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        Make the lecture visible as soon as the selected video
                                        qualities finish encoding.
                                      </span>
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      "flex items-start gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/10 transition",
                                      publishMode === "DRAFT" && "border-primary bg-primary/5"
                                    )}
                                    onClick={() => {
                                      fieldMode.handleChange("DRAFT");
                                      fieldDate.handleChange(null);
                                    }}
                                  >
                                    <div className="size-4 rounded-full border border-primary flex items-center justify-center shrink-0 mt-0.5">
                                      {publishMode === "DRAFT" && (
                                        <div className="size-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-semibold">
                                        Save as Draft (Keep hidden)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        Keep this lecture hidden from students.
                                      </span>
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      "flex items-start gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/10 transition",
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
                                    <div className="size-4 rounded-full border border-primary flex items-center justify-center shrink-0 mt-0.5">
                                      {publishMode === "SCHEDULED" && (
                                        <div className="size-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-semibold">
                                        Schedule Video (Publish at a specific date & time)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        Publish this lecture automatically at a specific date and
                                        time.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {publishMode === "SCHEDULED" && (
                                <div className="flex flex-col pl-7 animate-in fade-in duration-200">
                                  <DatePickerTime
                                    value={publishedAt}
                                    onChange={(val) => fieldDate.handleChange(val)}
                                    idPrefix="lecture-picker"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }}
                      </lectureForm.Field>
                    );
                  }}
                </lectureForm.Field>
              </div>
            </div>
          </form>
        </ScrollArea>
        <SheetFooter className="p-6 border-t flex flex-row justify-end gap-2 shrink-0 bg-muted/10">
          <SheetClose render={<Button type="button" variant="outline" />}>Cancel</SheetClose>
          <Button type="submit" form="lecture-form" disabled={isPending || isUploadingAttachment}>
            {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {editingLecture ? "Save Changes" : "Create Lecture"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
