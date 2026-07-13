import { useState, useRef, useEffect } from "react";
import { Settings, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { usePlaybackRateOptions, useQualityOptions, useCaptionsOptions } from "@videojs/react";
import { PlayerTooltip } from "./player-tooltip";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [currentSubmenu, setCurrentSubmenu] = useState<"main" | "speed" | "quality" | "captions">(
    "main"
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const playbackRate = usePlaybackRateOptions();
  const quality = useQualityOptions();
  const captions = useCaptionsOptions();

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <PlayerTooltip content="Settings">
        <button
          onClick={() => {
            setOpen(!open);
            setCurrentSubmenu("main");
          }}
          className="p-2 text-white/90 hover:text-dv-primary hover:scale-110 active:scale-95 transition-all duration-200"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </PlayerTooltip>

      {open && (
        <div className="absolute bottom-12 right-0 w-56 bg-dv-surface/50 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 text-sm text-white z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
          {currentSubmenu === "main" && (
            <div className="flex flex-col gap-0.5">
              {playbackRate && (
                <button
                  onClick={() => setCurrentSubmenu("speed")}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 text-left w-full"
                >
                  <span>Playback Speed</span>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    {playbackRate.rate}x <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              )}
              {quality && quality.options && quality.options.length > 0 && (
                <button
                  onClick={() => setCurrentSubmenu("quality")}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 text-left w-full"
                >
                  <span>Quality</span>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    {quality.options.find((o) => o.value === quality.value)?.label || "Auto"}{" "}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              )}
              {captions && captions.options && captions.options.length > 0 && (
                <button
                  onClick={() => setCurrentSubmenu("captions")}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 text-left w-full"
                >
                  <span>Subtitles</span>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    {captions.options.find((o) => o.value === captions.value)?.label || "Off"}{" "}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              )}
            </div>
          )}

          {currentSubmenu === "speed" && playbackRate && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setCurrentSubmenu("main")}
                className="flex items-center gap-1 p-2 font-semibold text-xs text-white/60 hover:bg-white/10 rounded-lg mb-1 w-full text-left"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Settings
              </button>

              {/* Use Shadcn UI ScrollArea for the speed selection list */}
              <ScrollArea className="h-44 pr-1.5">
                <div className="flex flex-col gap-0.5">
                  {playbackRate.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        playbackRate.setValue(opt.value);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/10 text-left"
                    >
                      <span className="flex items-center justify-between w-full pr-2">
                        <span>{opt.label}</span>
                        {opt.rate === 1 && (
                          <span className="text-[10px] text-white/40 font-medium">Default</span>
                        )}
                      </span>
                      {opt.rate === playbackRate.rate && (
                        <Check className="w-4 h-4 text-dv-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Direct Speed Entry Input */}
              <div className="border-t border-white/10 mt-1.5 pt-2 px-1.5 pb-1 flex flex-col gap-1">
                <div className="text-[10px] text-white/50 font-medium">Custom Speed:</div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.25"
                    max="16"
                    step="0.05"
                    placeholder="1.0"
                    defaultValue={playbackRate.rate}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        if (!isNaN(val) && val >= 0.1 && val <= 16) {
                          playbackRate.setValue(String(val));
                          setOpen(false);
                        }
                      }
                    }}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-dv-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousSibling as HTMLInputElement;
                      const val = parseFloat(input.value);
                      if (!isNaN(val) && val >= 0.1 && val <= 16) {
                        playbackRate.setValue(String(val));
                        setOpen(false);
                      }
                    }}
                    className="bg-dv-primary hover:bg-dv-hover text-white text-[10px] font-semibold px-2 py-1.5 rounded-lg active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentSubmenu === "quality" && quality && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setCurrentSubmenu("main")}
                className="flex items-center gap-1 p-2 font-semibold text-xs text-white/60 hover:bg-white/10 rounded-lg mb-1 w-full text-left"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Settings
              </button>
              {quality.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    quality.setValue(opt.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/10 text-left"
                >
                  <span>{opt.label}</span>
                  {opt.value === quality.value && <Check className="w-4 h-4 text-dv-primary" />}
                </button>
              ))}
            </div>
          )}

          {currentSubmenu === "captions" && captions && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setCurrentSubmenu("main")}
                className="flex items-center gap-1 p-2 font-semibold text-xs text-white/60 hover:bg-white/10 rounded-lg mb-1 w-full text-left"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Settings
              </button>
              {captions.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    captions.setValue(opt.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/10 text-left"
                >
                  <span>{opt.label}</span>
                  {opt.value === captions.value && <Check className="w-4 h-4 text-dv-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
