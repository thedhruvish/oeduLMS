import { useEffect, useState, useRef } from "react";
import { Player } from "../player";
import { RotateCcw } from "lucide-react";

interface Props {
  src: string;
  initialTime?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
}

export function ResumePlaybackTracker({ src, initialTime, onProgressUpdate }: Props) {
  const store = Player.usePlayer();
  const [showToast, setShowToast] = useState(false);
  const [resumedTime, setResumedTime] = useState(0);

  const state = Player.usePlayer((s) => ({
    currentTime: s.currentTime,
    duration: s.duration,
    paused: s.paused,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const lastResumedSrcRef = useRef<string | null>(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  // Handle saving time periodically
  useEffect(() => {
    if (!src || !store.target || state.paused || !onProgressUpdateRef.current) return;

    const interval = setInterval(() => {
      const current = stateRef.current.currentTime;
      const dur = stateRef.current.duration;

      if (current === 0 || dur === 0) return;

      if (onProgressUpdateRef.current) {
        onProgressUpdateRef.current(current, dur);
      }
    }, 5000); // 5 seconds polling intervalw
    return () => clearInterval(interval);
  }, [src, state.paused, store.target]);

  // Handle loading / resuming time on source load
  useEffect(() => {
    if (!src) return;

    let active = true;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const checkAndResume = () => {
      if (!active) return;
      if (!store.target) {
        // Retry next frame once target is mounted
        requestAnimationFrame(checkAndResume);
        return;
      }

      if (lastResumedSrcRef.current === src) return;
      lastResumedSrcRef.current = src;

      const savedTime = initialTime || 0;

      if (savedTime > 2) {
        store.seek(savedTime);
        setResumedTime(savedTime);
        setShowToast(true);

        // Auto play video
        store.play();

        toastTimer = setTimeout(() => {
          if (active) {
            setShowToast(false);
          }
        }, 5000);
      } else {
        // Auto play video even starting from the beginning
        store.play();
      }
    };

    checkAndResume();

    return () => {
      active = false;
      if (toastTimer) {
        clearTimeout(toastTimer);
      }
    };
  }, [src, store, initialTime]);

  const handleStartOver = () => {
    if (!store.target) return;
    store.seek(0);
    if (onProgressUpdate) {
      onProgressUpdate(0, stateRef.current.duration);
    }
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
