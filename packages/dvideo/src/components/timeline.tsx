import React, { useRef, useState, useEffect } from "react";
import { Player } from "../player";

export function Timeline() {
  const store = Player.usePlayer();
  const state = Player.usePlayer((s) => ({
    currentTime: s.currentTime,
    duration: s.duration,
  }));

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const getProgressPercent = () => {
    if (isDragging) return dragProgress * 100;
    if (state.duration === 0) return 0;
    return (state.currentTime / state.duration) * 100;
  };

  const handleSeekToPosition = (clientX: number) => {
    if (!timelineRef.current || state.duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDragProgress(pos);
    if (!isDragging) {
      store.seek(pos * state.duration);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeekToPosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    if (e.touches && e.touches[0]) {
      handleSeekToPosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSeekToPosition(e.clientX);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      if (timelineRef.current && state.duration > 0) {
        const rect = timelineRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        store.seek(pos * state.duration);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleSeekToPosition(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (state.duration > 0) {
        store.seek(dragProgress * state.duration);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, state.duration, store, dragProgress]);

  const percent = getProgressPercent();

  return (
    <div
      ref={timelineRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="relative w-full h-3 flex items-center cursor-pointer group/timeline z-40 select-none"
    >
      {/* Background track */}
      <div className="w-full h-1 bg-white/20 group-hover/timeline:h-1.5 rounded-full transition-all duration-150 relative overflow-hidden">
        {/* Playback progress */}
        <div
          className="absolute top-0 left-0 h-full bg-dv-primary rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* Scrubber thumb */}
      <div
        className="absolute w-3 h-3 bg-dv-primary rounded-full scale-75 group-hover/timeline:scale-110 transition-transform duration-150 pointer-events-none"
        style={{ left: `calc(${percent}% - 6px)` }}
      />
    </div>
  );
}
