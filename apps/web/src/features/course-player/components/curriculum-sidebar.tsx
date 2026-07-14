import { BookOpen } from "lucide-react";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";
import type { PlayerSection } from "@/api/course-player";
import { CurriculumSection } from "./curriculum-section";

interface CurriculumSidebarProps {
  sections: PlayerSection[];
  activeLectureId: string | undefined;
  searchQuery: string;
  stats: { totalLectures: number; completedLectures: number };
  onSelectLecture: (lectureId: string) => void;
}

function filterSections(sections: PlayerSection[], query: string): PlayerSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;

  return sections
    .map((section) => {
      const sectionMatch = section.title.toLowerCase().includes(q);
      const matchedLectures = section.lectures.filter((l) => l.title.toLowerCase().includes(q));

      if (sectionMatch) {
        return section;
      }

      if (matchedLectures.length > 0) {
        return {
          ...section,
          lectures: matchedLectures,
          totalVideos: matchedLectures.length,
          watchedVideos: matchedLectures.filter((l) => l.progress.completed).length,
        };
      }

      return null;
    })
    .filter((s): s is PlayerSection => s !== null);
}

export function CurriculumSidebar({
  sections,
  activeLectureId,
  searchQuery,
  stats,
  onSelectLecture,
}: CurriculumSidebarProps) {
  const filtered = filterSections(sections, searchQuery);

  return (
    <aside className="flex h-full w-full flex-col bg-card">
      <div className="flex shrink-0 flex-col gap-1 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Course content</h2>
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {stats.completedLectures}/{stats.totalLectures} lectures completed
        </p>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <p className="text-xs text-muted-foreground">
              {searchQuery.trim()
                ? "No sections or lectures match your search."
                : "No curriculum available yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((section, idx) => (
              <CurriculumSection
                key={section.id}
                section={section}
                activeLectureId={activeLectureId}
                defaultOpen={idx === 0 || section.lectures.some((l) => l.id === activeLectureId)}
                onSelectLecture={onSelectLecture}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
