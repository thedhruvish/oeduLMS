import { motion } from "motion/react";
import { X, Play } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { DvideoPlayer } from "@oedulms/dvideo";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
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

export function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-md"
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
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {isYouTubeUrl(videoUrl) ? (
            <iframe
              src={getYouTubeEmbedUrl(videoUrl)}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full">
              <DvideoPlayer src={videoUrl} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
