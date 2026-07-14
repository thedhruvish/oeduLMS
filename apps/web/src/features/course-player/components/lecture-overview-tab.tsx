import { Separator } from "@oedulms/ui/components/separator";
import { SafeHtmlRenderer } from "@/components/safe-html-renderer";
import type { PlayerLecture } from "@/api/course-player";
import { LectureComments } from "./lecture-comments";

interface LectureOverviewTabProps {
  courseId: string;
  lecture: PlayerLecture;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function LectureOverviewTab({ courseId, lecture }: LectureOverviewTabProps) {
  const description = lecture.description?.trim();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">{lecture.title}</h2>
        {description ? (
          looksLikeHtml(description) ? (
            <SafeHtmlRenderer html={description} />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No description provided for this lecture.
          </p>
        )}
      </div>

      <Separator />

      <LectureComments courseId={courseId} lectureId={lecture.id} />
    </div>
  );
}
