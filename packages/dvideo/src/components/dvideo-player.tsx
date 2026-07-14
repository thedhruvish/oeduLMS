import { useState, useRef, useEffect, memo } from "react";
import { Controls, useCaptionsOptions } from "@videojs/react";
import { Video } from "@videojs/react/video";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import {
  SkipBack,
  SkipForward,
  Keyboard,
  Info,
  Play,
  Pause,
  Subtitles,
  RectangleHorizontal,
} from "lucide-react";
import { Player } from "../player";
import { PlayPauseButton } from "./play-pause-button";
import { VolumeControl } from "./volume-control";
import { Timeline } from "./timeline";
import { TimeDisplay } from "./time-display";
import { SettingsMenu } from "./settings-menu";
import { PiPFullscreenControls } from "./pip-fullscreen-controls";
import { ResumePlaybackTracker } from "./resume-playback-tracker";
import { PlayerTooltip } from "./player-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@oedulms/ui/components/dialog";
import { cn } from "@oedulms/ui/lib/utils";

interface Props {
  src: string;
  type?: string;
  poster?: string;
  onNext?: () => void;
  onPrev?: () => void;
  isEnableCinemaMode?: boolean;
  className?: string;
}

function DvideoPlayerInner({
  src,
  poster,
  onNext,
  onPrev,
  isEnableCinemaMode = false,
  className,
}: Props) {
  const store = Player.usePlayer();

  const state = Player.usePlayer((s) => ({
    paused: s.paused,
    fullscreen: s.fullscreen,
    pip: s.pip,
    currentTime: s.currentTime,
    duration: s.duration,
    volume: s.volume,
    playbackRate: s.playbackRate,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isHolding2x, setIsHolding2x] = useState(false);
  const [speedHUD, setSpeedHUD] = useState<{ speed: number; key: number } | null>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "play" | "pause"; key: number } | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!state.paused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (state.paused) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [state.paused]);

  const handleMouseMove = () => {
    setShowControls(true);
    resetControlsTimeout();
  };

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalSpeedRef = useRef(1);
  const is2xActiveRef = useRef(false);

  const captions = useCaptionsOptions();
  const hasSubtitles = captions && captions.options && captions.options.length > 1;
  const isSubtitlesActive = captions && captions.value !== "off";

  const handleSubtitleToggle = () => {
    if (!captions || !captions.options) return;
    if (captions.value !== "off") {
      captions.setValue("off");
    } else {
      const activeOption = captions.options.find((o) => o.value !== "off");
      if (activeOption) {
        captions.setValue(activeOption.value);
      }
    }
  };

  // Reset speed HUD feedback banner after 1.5 seconds
  useEffect(() => {
    if (!speedHUD) return;
    const timer = setTimeout(() => setSpeedHUD(null), 1500);
    return () => clearTimeout(timer);
  }, [speedHUD]);

  // Combined click-hold and keyboard shortcuts
  useEffect(() => {
    const isTyping = (target: EventTarget | null): boolean => {
      if (!target) return false;
      const element = target as HTMLElement;
      return (
        ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) ||
        element.isContentEditable ||
        element.closest("[contenteditable='true']") !== null
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) {
        return;
      }

      // Handle Shift + ?
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }

      // Handle Shift + > or . (Speed up)
      if (e.shiftKey && (e.key === ">" || e.key === ".")) {
        e.preventDefault();
        const currentRate = stateRef.current.playbackRate;
        const newRate = Math.min(currentRate + 0.25, 4.0);
        store.setPlaybackRate(newRate);
        setSpeedHUD({ speed: newRate, key: Date.now() });
        return;
      }

      // Handle Shift + < or , (Speed down)
      if (e.shiftKey && (e.key === "<" || e.key === ",")) {
        e.preventDefault();
        const currentRate = stateRef.current.playbackRate;
        const newRate = Math.max(currentRate - 0.25, 0.25);
        store.setPlaybackRate(newRate);
        setSpeedHUD({ speed: newRate, key: Date.now() });
        return;
      }

      // Handle Space long-press hold
      if (e.key === " ") {
        e.preventDefault();
        if (e.repeat) return;

        holdTimeoutRef.current = setTimeout(() => {
          is2xActiveRef.current = true;
          setIsHolding2x(true);
          originalSpeedRef.current = stateRef.current.playbackRate;
          store.setPlaybackRate(2);
        }, 350);
        return;
      }

      const currentState = stateRef.current;

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          if (currentState.paused) {
            store.play();
            setFeedback({ type: "play", key: Date.now() });
          } else {
            store.pause();
            setFeedback({ type: "pause", key: Date.now() });
          }
          break;
        case "f":
          e.preventDefault();
          if (currentState.fullscreen) store.exitFullscreen();
          else store.requestFullscreen();
          break;
        case "m":
          e.preventDefault();
          store.toggleMuted();
          break;
        case "p":
          e.preventDefault();
          if (currentState.pip) store.exitPictureInPicture();
          else store.requestPictureInPicture();
          break;
        case "c":
          e.preventDefault();
          handleSubtitleToggle();
          break;
        case "t":
          e.preventDefault();
          if (isEnableCinemaMode) {
            setIsCinemaMode((prev) => !prev);
          }
          break;
        case "arrowright":
          e.preventDefault();
          store.seek(Math.min(currentState.currentTime + 5, currentState.duration));
          break;
        case "arrowleft":
          e.preventDefault();
          store.seek(Math.max(currentState.currentTime - 5, 0));
          break;
        case "arrowup":
          e.preventDefault();
          store.setVolume(Math.min(currentState.volume + 0.05, 1));
          break;
        case "arrowdown":
          e.preventDefault();
          store.setVolume(Math.max(currentState.volume - 0.05, 0));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTyping(e.target)) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        if (is2xActiveRef.current) {
          store.setPlaybackRate(originalSpeedRef.current);
          is2xActiveRef.current = false;
          setIsHolding2x(false);
        } else {
          if (stateRef.current.paused) {
            store.play();
            setFeedback({ type: "play", key: Date.now() });
          } else {
            store.pause();
            setFeedback({ type: "pause", key: Date.now() });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [store, isEnableCinemaMode, hasSubtitles, isSubtitlesActive]);

  // Click hold handling on the player surface
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    holdTimeoutRef.current = setTimeout(() => {
      is2xActiveRef.current = true;
      setIsHolding2x(true);
      originalSpeedRef.current = stateRef.current.playbackRate;
      store.setPlaybackRate(2);
    }, 350);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Prevent triggering if clicked on controls or timeline
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input") ||
      (e.target as HTMLElement).closest("[role='dialog']") ||
      (e.target as HTMLElement).closest(".pointer-events-auto")
    ) {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      return;
    }

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (is2xActiveRef.current) {
      store.setPlaybackRate(originalSpeedRef.current);
      is2xActiveRef.current = false;
      setIsHolding2x(false);
    } else {
      // If controls are hidden, first tap/click just shows them
      if (!showControls) {
        setShowControls(true);
        resetControlsTimeout();
      } else {
        if (state.paused) {
          store.play();
          setFeedback({ type: "play", key: Date.now() });
        } else {
          store.pause();
          setFeedback({ type: "pause", key: Date.now() });
        }
        resetControlsTimeout();
      }
    }
  };

  const handleMouseLeave = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (is2xActiveRef.current) {
      store.setPlaybackRate(originalSpeedRef.current);
      is2xActiveRef.current = false;
      setIsHolding2x(false);
    }
    // Hide controls when mouse leaves container (unless paused)
    if (!state.paused) {
      setShowControls(false);
    }
  };

  const containerClasses = cn(
    "relative group w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl select-none transition-all duration-300",
    isCinemaMode &&
      "w-screen max-w-none md:left-1/2 md:-translate-x-1/2 md:relative z-40 rounded-none aspect-[21/9]",
    className
  );

  const isHls = src.endsWith(".m3u8") || src.includes(".m3u8");

  return (
    <Player.Container
      ref={setContainerEl}
      className={containerClasses}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Click-to-play surface & Hold-to-speedup (z-10) */}
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 cursor-pointer z-10"
      />

      {isHls ? (
        <HlsJsVideo
          src={src}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onSeeking={() => setIsBuffering(true)}
          onSeeked={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
        />
      ) : (
        <Video
          src={src}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onSeeking={() => setIsBuffering(true)}
          onSeeked={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
        />
      )}

      {/* Speed up hold Banner */}
      {isHolding2x && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-semibold tracking-wider flex items-center gap-1.5 z-40 transition-all duration-200 animate-in fade-in zoom-in-95">
          <div className="w-2 h-2 rounded-full bg-dv-primary animate-pulse" />
          <span>2.0x SPEED</span>
        </div>
      )}

      {/* Speed Change Hotkey HUD Banner */}
      {speedHUD && !isHolding2x && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-semibold tracking-wider flex items-center gap-1.5 z-40 transition-all duration-200 animate-in fade-in zoom-in-95">
          <span>SPEED: {speedHUD.speed.toFixed(2).replace(/\.00$/, "")}x</span>
        </div>
      )}

      {/* Premium Buffering Dual-Ring Glass Loader Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] pointer-events-none z-25 animate-in fade-in duration-300">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Outer spinning ring (clockwise) */}
            <div className="absolute inset-0 border-4 border-white/5 border-t-dv-primary rounded-full animate-spin [animation-duration:1.1s]" />
            {/* Inner counter-rotating ring (counter-clockwise) */}
            <div className="w-10 h-10 border-4 border-dv-primary/10 border-t-white rounded-full animate-spin [animation-duration:0.8s] [animation-direction:reverse]" />
          </div>
        </div>
      )}

      {/* Flashing Center Play/Pause Feedback (restricted to user-interactive clicks & hotkeys) */}
      {feedback && !isBuffering && (
        <div
          key={feedback.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div className="bg-black/60 text-white p-5 rounded-full animate-scale-fade flex items-center justify-center">
            {feedback.type === "play" ? (
              <Play className="w-10 h-10 fill-current text-white" />
            ) : (
              <Pause className="w-10 h-10 fill-current text-white" />
            )}
          </div>
        </div>
      )}

      {/* Custom Controls Overlay */}
      <Controls.Root
        className={cn(
          "absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-black/20 to-black/50 p-4 transition-opacity duration-300 z-30 pointer-events-none",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Top Row: Keyboard Shortcut Info Button */}
        <div className="flex justify-end w-full pointer-events-auto">
          <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
            <PlayerTooltip content="Keyboard Shortcuts" shortcut="Shift+?">
              <DialogTrigger
                render={
                  <button className="p-2 text-white/80 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer">
                    <Keyboard className="w-5 h-5" />
                  </button>
                }
              />
            </PlayerTooltip>

            <DialogContent
              container={containerEl}
              className="bg-zinc-950 border border-white/10 text-white rounded-2xl max-w-sm p-6 shadow-2xl z-50"
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-dv-primary" /> Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription className="text-white/60 text-xs">
                  Quickly control your player with these hotkeys:
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2.5 text-xs text-white/90">
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Play / Pause</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">
                    Space / K
                  </kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Fullscreen</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">F</kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Mute / Unmute</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">M</kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Picture-in-Picture</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">P</kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Subtitles</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">C</kbd>
                </div>
                {isEnableCinemaMode && (
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span>Cinema Mode</span>
                    <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">T</kbd>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Playback Speed Up / Down</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">
                    Shift + &gt; / &lt;
                  </kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Seek Back / Forward</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">← / →</kbd>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span>Volume Up / Down</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">↑ / ↓</kbd>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span>Shortcuts Help Dialog</span>
                  <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">
                    Shift + ?
                  </kbd>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col gap-2 w-full pointer-events-auto">
          {/* Timeline */}
          <Timeline />

          {/* Bottom Row controls */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              {onPrev && (
                <PlayerTooltip content="Previous Video">
                  <button
                    onClick={onPrev}
                    className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
                    title="Previous"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>
                </PlayerTooltip>
              )}

              <PlayPauseButton />

              {onNext && (
                <PlayerTooltip content="Next Video">
                  <button
                    onClick={onNext}
                    className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
                    title="Next"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                </PlayerTooltip>
              )}

              <VolumeControl />
              <TimeDisplay />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1">
              {hasSubtitles && (
                <PlayerTooltip
                  content={isSubtitlesActive ? "Turn off captions" : "Turn on captions"}
                  shortcut="C"
                >
                  <button
                    onClick={handleSubtitleToggle}
                    className={`p-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
                      isSubtitlesActive ? "text-dv-primary" : "text-white/90 hover:text-dv-primary"
                    }`}
                  >
                    <Subtitles className="w-5 h-5" />
                  </button>
                </PlayerTooltip>
              )}

              <SettingsMenu />

              {isEnableCinemaMode && (
                <PlayerTooltip content={isCinemaMode ? "Default view" : "Cinema mode"} shortcut="T">
                  <button
                    onClick={() => setIsCinemaMode((prev) => !prev)}
                    className={`p-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
                      isCinemaMode ? "text-dv-primary" : "text-white/90 hover:text-dv-primary"
                    }`}
                  >
                    <RectangleHorizontal className="w-5 h-5" />
                  </button>
                </PlayerTooltip>
              )}

              <PiPFullscreenControls />
            </div>
          </div>
        </div>
      </Controls.Root>

      <ResumePlaybackTracker src={src} />
    </Player.Container>
  );
}

export const DvideoPlayer = memo(function DvideoPlayer(props: Props) {
  return (
    <Player.Provider>
      <DvideoPlayerInner {...props} />
    </Player.Provider>
  );
});
