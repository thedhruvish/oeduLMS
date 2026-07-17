import * as React from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { UploadCloud, X, Film, Loader2, Play } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { uploadFileToS3, deleteFileFromS3, startBackgroundUpload } from "@/api/media";
import { useUploadStore } from "@/store/upload-store";
import { toast } from "sonner";
import { cn } from "@oedulms/ui/lib/utils";
import { useConfirm } from "@/store/confirm-store";

interface MediaUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  directory?: string;
  acceptType?: "image" | "video" | "all";
  maxSize?: number; // in bytes
  backgroundUpload?: boolean;
  onUploadStart?: (uploadId: string) => void;
  onPlayPreview?: (url: string) => void;
}

export function MediaUploader({
  value,
  onChange,
  onRemove,
  directory = "general",
  acceptType = "all",
  maxSize = 100 * 1024 * 1024, // 100MB default
  backgroundUpload = false,
  onUploadStart,
  onPlayPreview,
}: MediaUploaderProps) {
  const [progress, setProgress] = React.useState<number | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const confirm = useConfirm();
  const [uploadedKey, setUploadedKey] = React.useState<string | null>(null);
  const [currentUploadId, setCurrentUploadId] = React.useState<string | null>(null);

  // Subscribe to global upload state if backgroundUpload is enabled
  const storeUpload = useUploadStore((state) =>
    currentUploadId ? state.uploads.find((u) => u.id === currentUploadId) : null
  );

  const localProgress = storeUpload ? storeUpload.progress : progress;
  const localIsUploading = storeUpload ? storeUpload.status === "uploading" : isUploading;

  const getAcceptOption = (): Accept => {
    if (acceptType === "image") {
      return { "image/*": [] };
    }
    if (acceptType === "video") {
      return { "video/*": [] };
    }
    return {
      "image/*": [],
      "video/*": [],
    };
  };

  const onDrop = React.useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections && fileRejections.length > 0) {
        const error = fileRejections[0].errors[0];
        let message = "File was rejected.";
        if (error.code === "file-too-large") {
          let sizeLimit = "100MB";
          if (maxSize) {
            const gb = maxSize / (1024 * 1024 * 1024);
            if (gb >= 1) {
              sizeLimit = `${gb.toFixed(0)}GB`;
            } else {
              sizeLimit = `${(maxSize / (1024 * 1024)).toFixed(0)}MB`;
            }
          }
          message = `File is too large. Max size is ${sizeLimit}.`;
        } else if (error.code === "file-invalid-type") {
          message = `Invalid file type. Only ${acceptType === "video" ? "videos" : acceptType === "image" ? "images" : "supported files"} are allowed.`;
        } else {
          message = error.message;
        }
        toast.error(message);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (backgroundUpload) {
        const uploadId = startBackgroundUpload(file, directory, (fileUrl, key) => {
          setUploadedKey(key);
          onChange(fileUrl);
        });
        setCurrentUploadId(uploadId);
        if (onUploadStart) {
          onUploadStart(uploadId);
        }
      } else {
        setIsUploading(true);
        setProgress(0);

        try {
          const res = await uploadFileToS3(file, directory, (pct) => {
            setProgress(pct);
          });

          setUploadedKey(res.key);
          onChange(res.fileUrl);
          toast.success("File uploaded successfully!");
        } catch (err: unknown) {
          console.error("Upload error:", err);
          const msg = err instanceof Error ? err.message : "Failed to upload file.";
          toast.error(msg);
        } finally {
          setIsUploading(false);
          setProgress(null);
        }
      }
    },
    [directory, onChange, backgroundUpload, onUploadStart, maxSize, acceptType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptOption(),
    maxFiles: 1,
    maxSize,
    disabled: localIsUploading,
  });

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;

    const mediaLabel =
      acceptType === "video" ? "Video" : acceptType === "image" ? "Thumbnail" : "File";
    const isConfirmed = await confirm({
      title: `Delete ${mediaLabel}?`,
      desc: `Are you sure you want to delete this ${mediaLabel.toLowerCase()}?`,
      destructive: true,
      confirmText: "Delete",
    });
    if (!isConfirmed) return;

    // Extract key from S3 URL or use stored key
    let keyToDelete = uploadedKey;
    if (!keyToDelete) {
      try {
        const urlObj = new URL(value);
        // Pathname starts with '/', slice it off to get the S3 key
        keyToDelete = decodeURIComponent(urlObj.pathname.slice(1));
      } catch (err) {
        console.error("Failed to parse S3 URL key:", err);
      }
    }

    if (keyToDelete) {
      try {
        await deleteFileFromS3(keyToDelete);
      } catch (err) {
        console.warn("Could not delete from S3 bucket directly:", err);
      }
    }

    setUploadedKey(null);
    onChange("");
    if (onRemove) onRemove();
  };

  const isImage = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) !== null || url.includes("image");
  };

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov|mkv)/i) !== null || url.includes("video");
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {value ? (
        <div className="relative border rounded-lg overflow-hidden bg-muted/30 aspect-video flex items-center justify-center group">
          {isImage(value) ? (
            <img src={value} alt="Uploaded preview" className="size-full object-cover" />
          ) : isVideo(value) ? (
            onPlayPreview ? (
              <div
                onClick={() => onPlayPreview(value)}
                className="relative size-full bg-muted flex items-center justify-center cursor-pointer group/player"
              >
                <div className="absolute inset-0 bg-background/40 flex items-center justify-center group-hover/player:bg-background/60 transition-colors">
                  <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover/player:scale-110 transition-transform">
                    <Play className="size-5 fill-current translate-x-0.5" />
                  </div>
                </div>
                <Film className="size-12 text-white/30" />
              </div>
            ) : (
              <video src={value} controls className="size-full bg-muted object-contain" />
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
              <Film className="size-8 text-primary" />
              <span className="text-xs truncate max-w-xs">{value}</span>
            </div>
          )}

          {/* Remove Button */}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition shadow-md"
            onClick={handleRemove}
            disabled={localIsUploading}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-all min-h-[140px]",
            isDragActive && "border-primary bg-primary/5",
            localIsUploading && "pointer-events-none opacity-60"
          )}
        >
          <input {...getInputProps()} />

          {localIsUploading ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
              <Loader2 className="size-6 text-primary animate-spin" />
              <span className="text-xs font-medium text-muted-foreground">
                Uploading... {localProgress}%
              </span>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${localProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="p-2.5 rounded-full bg-muted/40 text-muted-foreground mb-1">
                <UploadCloud className="size-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {isDragActive ? "Drop the file here" : "Drag & drop files here"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                or click to browse your local device
              </p>
              <p className="text-[9px] text-muted-foreground/60 mt-1">
                {acceptType === "image"
                  ? "Images only"
                  : acceptType === "video"
                    ? "Videos only"
                    : "Images and Videos up to 100MB"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
