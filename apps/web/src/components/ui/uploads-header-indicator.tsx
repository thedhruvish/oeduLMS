import * as React from "react";
import { CloudUpload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUploadStore } from "@/store/upload-store";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from "@oedulms/ui/components/popover";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import { cn } from "@oedulms/ui/lib/utils";

export function UploadsHeaderIndicator() {
  const uploads = useUploadStore((state) => state.uploads);
  const isUploadingAny = useUploadStore((state) => state.isUploadingAny());

  const activeUploads = uploads.filter((u) => u.status === "uploading");

  if (uploads.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "relative p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer",
              isUploadingAny && "text-primary animate-pulse"
            )}
            title="S3 Upload Progress"
          />
        }
      >
        <CloudUpload className="size-5" />
        {activeUploads.length > 0 && (
          <span className="absolute top-1 right-1 size-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background">
            {activeUploads.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 flex flex-col gap-3">
        <PopoverTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
          Direct S3 Uploads
        </PopoverTitle>

        <ScrollArea className="max-h-60 pr-1">
          <div className="flex flex-col gap-2.5">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex flex-col gap-1 text-[11px] border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="flex justify-between items-center gap-2">
                  <span
                    className="font-semibold text-foreground truncate max-w-[180px]"
                    title={upload.filename}
                  >
                    {upload.filename}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {upload.status === "uploading" ? (
                      <span className="text-primary flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        {upload.progress}%
                      </span>
                    ) : upload.status === "completed" ? (
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <CheckCircle2 className="size-3" />
                        Done
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-0.5">
                        <AlertCircle className="size-3" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {upload.status === "uploading" && (
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
