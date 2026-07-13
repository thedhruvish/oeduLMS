import { useState } from "react";
import { Player } from "../player";

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function TimeDisplay() {
  const [showRemaining, setShowRemaining] = useState(false);

  const state = Player.usePlayer((s) => ({
    currentTime: s.currentTime,
    duration: s.duration,
  }));

  const leftDisplay = showRemaining
    ? `-${formatTime(Math.max(0, state.duration - state.currentTime))}`
    : formatTime(state.currentTime);

  const rightDisplay = formatTime(state.duration);

  return (
    <span
      onClick={() => setShowRemaining((o) => !o)}
      className="text-white text-xs select-none tabular-nums font-medium opacity-90 cursor-pointer hover:opacity-100 transition-opacity"
      title={showRemaining ? "Click to show elapsed time" : "Click to show remaining time"}
    >
      {leftDisplay} / {rightDisplay}
    </span>
  );
}
