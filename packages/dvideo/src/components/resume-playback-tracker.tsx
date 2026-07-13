import { useEffect, useState } from "react";
import { Player } from "../player";
import { RotateCcw } from "lucide-react";

interface Props {
  src: string;
}

export function ResumePlaybackTracker({ src }: Props) {
  const store = Player.usePlayer();
  const [showToast, setShowToast] = useState(false);
  const [resumedTime, setResumedTime] = useState(0);

  const state = Player.usePlayer((s) => ({
    currentTime: s.currentTime,
    duration: s.duration,
  }));

  // Handle saving time periodically
  useEffect(() => {
    if (!src || state.currentTime === 0 || state.duration === 0) return;

    // Don't save if near the end of video
    if (state.duration - state.currentTime < 5) {
      localStorage.removeItem(`dvideo-progress:${src}`);
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem(`dvideo-progress:${src}`, String(state.currentTime));
    }, 1500);

    return () => clearTimeout(timer);
  }, [src, state.currentTime, state.duration]);

  // Handle loading / resuming time on source load
  useEffect(() => {
    if (!src) return;
    const savedTimeRaw = localStorage.getItem(`dvideo-progress:${src}`);
    if (savedTimeRaw) {
      const savedTime = parseFloat(savedTimeRaw);
      if (savedTime > 2) {
        store.seek(savedTime);
        setResumedTime(savedTime);
        setShowToast(true);
        const timer = setTimeout(() => setShowToast(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [src, store]);

  const handleStartOver = () => {
    store.seek(0);
    localStorage.removeItem(`dvideo-progress:${src}`);
    setShowToast(false);
  };

  if (!showToast) return null;

  const m = Math.floor(resumedTime / 60);
  const s = Math.floor(resumedTime % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="absolute top-4 left-4 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl text-white text-xs z-40 transition-all duration-300 shadow-2xl animate-in fade-in slide-in-from-top-4">
      <span>
        Resumed playback from {m}:{s}
      </span>
      <button
        onClick={handleStartOver}
        className="flex items-center gap-1 text-dv-primary hover:text-dv-hover transition-colors font-medium border-l border-white/10 pl-3"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Start Over
      </button>
    </div>
  );
}
