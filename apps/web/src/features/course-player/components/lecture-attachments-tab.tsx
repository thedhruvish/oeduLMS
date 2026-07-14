import { Download, FileText, Paperclip } from "lucide-react";
import { Badge } from "@oedulms/ui/components/badge";
import { Button } from "@oedulms/ui/components/button";
import type { LectureResource } from "@/api/course-player";
import { formatFileSize, getResourceIconLabel } from "../utils";

interface LectureAttachmentsTabProps {
  resources: LectureResource[];
}

export function LectureAttachmentsTab({ resources }: LectureAttachmentsTabProps) {
  if (!resources || resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Paperclip className="size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No attachments</p>
        <p className="text-xs text-muted-foreground">
          This lecture does not have any downloadable resources yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Attachments & resources</h3>
        <p className="text-xs text-muted-foreground">
          Download slides, source files, and other materials for this lecture.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {resources.map((resource) => (
          <li
            key={resource.id}
            className="flex items-center gap-3 border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex size-10 shrink-0 items-center justify-center border border-border/40 bg-muted/40">
              <FileText className="size-4 text-muted-foreground" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-xs font-semibold text-foreground">
                {resource.title}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{getResourceIconLabel(resource.type)}</Badge>
                {resource.size != null && resource.size > 0 ? (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatFileSize(resource.size)}
                  </span>
                ) : null}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              render={<a href={resource.url} download target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              <Download data-icon="inline-start" />
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
