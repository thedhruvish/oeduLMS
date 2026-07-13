import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronDown, ChevronUp, Play } from "lucide-react";
import { usePublicCourseCurriculum } from "@/api/courses";
import { VideoPlayerModal } from "./video-player-modal";
import { PublicLecture, PublicSection } from "@/types/public";

interface SectionAccordionProps {
  section: PublicSection;
  isDefaultOpen: boolean;
  onPlayPreview: (lecture: PublicLecture) => void;
}

function SectionAccordion({ section, isDefaultOpen, onPlayPreview }: SectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-card/45 mb-3 transition-shadow hover:shadow-sm">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm sm:text-base text-foreground hover:bg-muted/40 transition-colors"
      >
        <span className="line-clamp-1">{section.title}</span>
        <div className="flex items-center gap-3 shrink-0 text-muted-foreground text-xs sm:text-sm font-normal">
          <span>{section.lectures.length} lessons</span>
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/60 bg-background/50"
          >
            <div className="p-2 space-y-1">
              {section.lectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/45 transition text-xs sm:text-sm text-foreground/90"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{lecture.title}</span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 text-xs text-muted-foreground">
                    <span>{Math.round(lecture.duration / 60)} min</span>
                    {lecture.isPreview && lecture.videoUrl && (
                      <button
                        onClick={() => onPlayPreview(lecture)}
                        className="inline-flex items-center gap-1 rounded bg-foreground text-background text-[10px] font-bold px-2 py-0.5 hover:opacity-90 cursor-pointer"
                      >
                        <Play className="size-2.5 fill-current" />
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CourseCurriculumProps {
  courseIdOrSlug: string;
}

export function CourseCurriculum({ courseIdOrSlug }: CourseCurriculumProps) {
  const { data: sections = [], isLoading, isError } = usePublicCourseCurriculum(courseIdOrSlug);
  const [selectedLecture, setSelectedLecture] = useState<PublicLecture | null>(null);

  const handlePlayPreview = (lecture: PublicLecture) => {
    setSelectedLecture(lecture);
  };

  return (
    <section>
      <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-4">Course Curriculum</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Explore the lessons and modules included in this curriculum. Click each module header to
        view lessons list.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="border border-border/60 rounded-xl h-14 bg-card/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-xs text-destructive">
          Failed to load curriculum sections. Please reload.
        </p>
      )}

      {!isLoading && !isError && sections.length === 0 && (
        <p className="text-sm text-muted-foreground">Curriculum details are coming soon.</p>
      )}

      {!isLoading && !isError && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <SectionAccordion
              key={section.id}
              section={section}
              isDefaultOpen={idx === 0}
              onPlayPreview={handlePlayPreview}
            />
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {selectedLecture && selectedLecture.videoUrl && (
        <VideoPlayerModal
          isOpen={!!selectedLecture}
          onClose={() => setSelectedLecture(null)}
          videoUrl={selectedLecture.videoUrl}
          title={`Preview: ${selectedLecture.title}`}
        />
      )}
    </section>
  );
}
