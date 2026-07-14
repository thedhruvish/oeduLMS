import { FileText, MessageCircleQuestion, Paperclip } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@oedulms/ui/components/tabs";
import type { PlayerLecture } from "@/api/course-player";
import { LectureOverviewTab } from "./lecture-overview-tab";
import { LectureQaTab } from "./lecture-qa-tab";
import { LectureAttachmentsTab } from "./lecture-attachments-tab";

interface LectureTabsPanelProps {
  courseId: string;
  lecture: PlayerLecture;
}

export function LectureTabsPanel({ courseId, lecture }: LectureTabsPanelProps) {
  const attachmentCount = lecture.resources?.length ?? 0;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList
        variant="line"
        className="w-full justify-start overflow-x-auto h-12 border-b border-border/50 gap-2 p-0"
      >
        <TabsTrigger
          value="overview"
          className="gap-1.5 px-4 h-full text-xs font-medium after:!bottom-0"
        >
          <FileText data-icon="inline-start" className="size-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="qa" className="gap-1.5 px-4 h-full text-xs font-medium after:!bottom-0">
          <MessageCircleQuestion data-icon="inline-start" className="size-4" />
          Q&amp;A
        </TabsTrigger>
        <TabsTrigger
          value="attachments"
          className="gap-1.5 px-4 h-full text-xs font-medium after:!bottom-0"
        >
          <Paperclip data-icon="inline-start" className="size-4" />
          Attachments
          {attachmentCount > 0 ? (
            <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
              ({attachmentCount})
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 outline-none">
        <LectureOverviewTab courseId={courseId} lecture={lecture} />
      </TabsContent>

      <TabsContent value="qa" className="mt-4 outline-none">
        <LectureQaTab courseId={courseId} lectureId={lecture.id} />
      </TabsContent>

      <TabsContent value="attachments" className="mt-4 outline-none">
        <LectureAttachmentsTab resources={lecture.resources ?? []} />
      </TabsContent>
    </Tabs>
  );
}
