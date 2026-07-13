import { Maximize, Minimize, Tv } from "lucide-react";
import { Player } from "../player";
import { PlayerTooltip } from "./player-tooltip";

export function PiPFullscreenControls() {
  const store = Player.usePlayer();
  const state = Player.usePlayer((s) => ({
    fullscreen: s.fullscreen,
    pip: s.pip,
  }));

  const handleFullscreenToggle = () => {
    if (state.fullscreen) {
      store.exitFullscreen();
    } else {
      store.requestFullscreen();
    }
  };

  const handlePiPToggle = () => {
    if (state.pip) {
      store.exitPictureInPicture();
    } else {
      store.requestPictureInPicture();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <PlayerTooltip content="Picture in Picture" shortcut="P">
        <button
          onClick={handlePiPToggle}
          className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
          title="Picture in Picture"
        >
          <Tv className="w-5 h-5" />
        </button>
      </PlayerTooltip>
      <PlayerTooltip content={state.fullscreen ? "Exit Fullscreen" : "Fullscreen"} shortcut="F">
        <button
          onClick={handleFullscreenToggle}
          className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
          title={state.fullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {state.fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </PlayerTooltip>
    </div>
  );
}
