import React, { Suspense } from "react";
import { motion } from "motion/react";
import { X, Play, Loader2 } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";

const LazyDvideoPlayer = React.lazy(() =>
  import("@oedulms/dvideo").then((m) => ({ default: m.DvideoPlayer }))
);

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  hlsUrl?: string | null;
}

function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube-nocookie.com")
  );
}

function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("/embed/")) {
    return url;
  }
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }
    if (urlObj.hostname.includes("youtu.be")) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }
  } catch {
    // Ignore parsing issues
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\\&v=)([^#\\&\\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
  }
  return url;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  hlsUrl,
}: VideoPlayerModalProps) {
  const [activeUrl, setActiveUrl] = React.useState(hlsUrl || videoUrl);

  React.useEffect(() => {
    setActiveUrl(hlsUrl || videoUrl);
  }, [hlsUrl, videoUrl]);

  const handlePlayerError = () => {
    if (hlsUrl && activeUrl === hlsUrl && videoUrl) {
      console.warn("HLS stream failed to play, falling back to direct videoUrl:", videoUrl);
      setActiveUrl(videoUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80"
      />

      {/* Dialog container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-4xl bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-foreground/5 flex items-center justify-center">
              <Play className="size-3 text-foreground" />
            </div>
            <h3 className="font-bold text-sm text-foreground line-clamp-1">{title}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-7 rounded-lg">
            <X className="size-4" />
          </Button>
        </div>

        {/* Video wrapper */}
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          {isYouTubeUrl(videoUrl) ? (
            <iframe
              src={getYouTubeEmbedUrl(videoUrl)}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Suspense
                fallback={
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="size-8 text-primary animate-spin" />
                    <span className="text-xs font-semibold text-zinc-400">Loading player...</span>
                  </div>
                }
              >
                <LazyDvideoPlayer src={activeUrl} onError={handlePlayerError} />
              </Suspense>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
