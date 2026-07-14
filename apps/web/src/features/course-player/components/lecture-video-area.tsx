import { DvideoPlayer } from "@oedulms/dvideo";
import { Film } from "lucide-react";

interface LectureVideoAreaProps {
  videoUrl: string | null | undefined;
  poster?: string | null;
  isTvMode: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  initialTime?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  initialPlaybackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
}

/**
 * The video player fills whatever container height is given to it via
 * the parent wrapper in course-player-page.tsx.
 * We use a single stable JSX tree so that toggling sidebar/TV mode or
 * resizing the screen does NOT unmount/reset the player.
 */
export function LectureVideoArea({
  videoUrl,
  poster,
  onNext,
  onPrev,
  initialTime,
  onProgressUpdate,
  initialPlaybackRate,
  onPlaybackRateChange,
}: LectureVideoAreaProps) {
  if (!videoUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <Film className="size-10 text-white/40" />
          <p className="text-sm text-white/60">No video available for this lecture yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <DvideoPlayer
        key={videoUrl}
        src={videoUrl}
        poster={poster ?? undefined}
        isEnableCinemaMode={false}
        onNext={onNext}
        onPrev={onPrev}
        initialTime={initialTime}
        onProgressUpdate={onProgressUpdate}
        initialPlaybackRate={initialPlaybackRate}
        onPlaybackRateChange={onPlaybackRateChange}
        className="h-full w-full rounded-none aspect-auto"
      />
    </div>
  );
}
