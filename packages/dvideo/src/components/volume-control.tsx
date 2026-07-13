import React, { useRef, useState, useEffect } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";
import { Player } from "../player";
import { PlayerTooltip } from "./player-tooltip";

export function VolumeControl() {
  const store = Player.usePlayer();
  const state = Player.usePlayer((s) => ({
    volume: s.volume,
    muted: s.muted,
  }));

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVolume, setDragVolume] = useState(1);

  const handleMuteToggle = () => {
    store.toggleMuted();
  };

  const getVolumePercent = () => {
    if (state.muted) return 0;
    if (isDragging) return dragVolume * 100;
    return state.volume * 100;
  };

  const handleVolumeSeek = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDragVolume(pos);
    if (!isDragging) {
      store.setVolume(pos);
      if (state.muted && pos > 0) {
        store.toggleMuted();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleVolumeSeek(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleVolumeSeek(e.clientX);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      if (sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        store.setVolume(pos);
        if (state.muted && pos > 0) {
          store.toggleMuted();
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, state.muted, store]);

  const isMuted = state.muted || state.volume === 0;
  const percent = getVolumePercent();

  return (
    <div className="flex items-center gap-1 group/volume">
      <PlayerTooltip content={isMuted ? "Unmute" : "Mute"} shortcut="M">
        <button
          onClick={handleMuteToggle}
          className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : state.volume < 0.5 ? (
            <Volume1 className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </PlayerTooltip>

      {/* Custom Volume Slider Wrapper (hides padding when collapsed to avoid leaking ghost thumb) */}
      <div className="w-0 group-hover/volume:w-20 group-hover/volume:pr-2 overflow-hidden transition-all duration-300 ease-out flex items-center">
        <div
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          className="relative w-full h-3 flex items-center cursor-pointer group/vol-slider select-none"
        >
          {/* Background track */}
          <div className="w-full h-1 bg-white/20 group-hover/vol-slider:h-1.5 rounded-full transition-all duration-150 relative overflow-hidden">
            {/* Volume progress fill */}
            <div
              className="absolute top-0 left-0 h-full bg-dv-primary rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          {/* Volume scrubber thumb (scales to 0 when collapsed to prevent ghost leak) */}
          <div
            className="absolute w-2.5 h-2.5 bg-white rounded-full scale-0 group-hover/volume:scale-75 group-hover/vol-slider:scale-110 transition-transform duration-150 pointer-events-none"
            style={{ left: `calc(${percent}% - 5px)` }}
          />
        </div>
      </div>
    </div>
  );
}
