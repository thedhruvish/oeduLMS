import { Play, Pause, RotateCcw } from "lucide-react";
import { Player } from "../player";
import { PlayerTooltip } from "./player-tooltip";

export function PlayPauseButton() {
  const store = Player.usePlayer();
  const state = Player.usePlayer((s) => ({
    paused: s.paused,
    ended: s.ended,
  }));

  if (state.ended) {
    return (
      <PlayerTooltip content="Replay" shortcut="Space">
        <button
          onClick={() => store.play()}
          className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
          title="Replay"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </PlayerTooltip>
    );
  }

  return (
    <PlayerTooltip content={state.paused ? "Play" : "Pause"} shortcut="Space / K">
      <button
        onClick={() => (state.paused ? store.play() : store.pause())}
        className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
        title={state.paused ? "Play" : "Pause"}
      >
        {state.paused ? (
          <Play className="w-5 h-5 fill-current" />
        ) : (
          <Pause className="w-5 h-5 fill-current" />
        )}
      </button>
    </PlayerTooltip>
  );
}
