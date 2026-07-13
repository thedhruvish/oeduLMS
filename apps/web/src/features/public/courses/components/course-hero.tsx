import { useState } from "react";
import { Clock, Play, BookOpen } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { VideoPlayerModal } from "./video-player-modal";
import { PublicCourseDetail } from "@/types/public";
import { getThumbClass } from "@/config/utils";

interface CourseHeroProps {
  course: PublicCourseDetail;
}

export function CourseHero({ course }: CourseHeroProps) {
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  return (
    <section className="border-b border-border/60 bg-muted/20 dark:bg-muted/5 pt-20 pb-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Left / Mid: Info */}
          <div className="md:col-span-2 space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-[10px] font-bold px-2 py-0.5 tracking-wide uppercase">
              Course Details
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {course.title}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {course.shortDescription}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium pt-2">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {course.durationSeconds
                  ? `${Math.round(course.durationSeconds / 3600)} hours`
                  : "30 hours"}
              </span>
              <span>
                by <strong className="text-foreground">{course.instructorName}</strong>
              </span>
            </div>
          </div>

          {/* Right: Trailer / Thumbnail Card */}
          <div
            onClick={() => course.trailerVideo && setIsPlayingTrailer(true)}
            className={`relative rounded-2xl overflow-hidden aspect-video border border-border/60 shadow-lg group max-w-md w-full ml-auto ${
              course.trailerVideo ? "cursor-pointer" : ""
            }`}
          >
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover absolute inset-0 transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${getThumbClass(course.id)} flex items-center justify-center`}
              >
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[size:20px_20px]" />
                <BookOpen className="size-16 text-white/20" />
              </div>
            )}

            {/* Play trailer trigger overlay */}
            {course.trailerVideo && (
              <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] opacity-100 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                <Button
                  type="button"
                  className="rounded-full bg-white text-zinc-950 hover:bg-zinc-100 size-14 flex items-center justify-center shadow-2xl scale-100 group-hover:scale-110 transition-transform duration-300"
                >
                  <Play className="size-6 fill-current translate-x-0.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Video Modal Player */}
      {course.trailerVideo && (
        <VideoPlayerModal
          isOpen={isPlayingTrailer}
          onClose={() => setIsPlayingTrailer(false)}
          videoUrl={course.trailerVideo}
          title={`Trailer: ${course.title}`}
        />
      )}
    </section>
  );
}
