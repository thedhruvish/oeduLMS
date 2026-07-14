import * as React from "react";
import { Card, CardContent, CardFooter } from "@oedulms/ui/components/card";
import { Button } from "@oedulms/ui/components/button";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Plus, X, Loader2 } from "lucide-react";
import { useCreatePost } from "@/api/feed";
import { uploadFileToS3 } from "@/api/media";
import { toast } from "sonner";
import { getInitials } from "@/lib/helper";

interface CreatePostCardProps {
  user: { name: string; image?: string | null } | null;
}

export function CreatePostCard({ user }: CreatePostCardProps) {
  const [newPostContent, setNewPostContent] = React.useState("");
  const [image, setImage] = React.useState<string | null>(null);
  const [video, setVideo] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const createPostMutation = useCreatePost();

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      await createPostMutation.mutateAsync({
        content: newPostContent,
        image: image || null,
        video: video || null,
      });
      setNewPostContent("");
      setImage(null);
      setVideo(null);
      toast.success("Post published successfully!");
    } catch {
      toast.error("Failed to publish post.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Clear previous media before starting upload
    setImage(null);
    setVideo(null);

    try {
      const res = await uploadFileToS3(file, "feed");
      if (file.type.startsWith("image/")) {
        setImage(res.fileUrl);
      } else if (file.type.startsWith("video/")) {
        setVideo(res.fileUrl);
      }
      toast.success("Media uploaded successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file.";
      toast.error(msg);
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm animate-in fade-in duration-200">
      <form onSubmit={handleCreatePost}>
        <CardContent className="pt-6 flex gap-4">
          <Avatar className="size-10 border shrink-0">
            {user?.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {user ? getInitials(user.name) : "S"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow flex flex-col gap-3">
            <Textarea
              placeholder="What's on your mind? Share updates, ask doubts..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="min-h-24 resize-none border-border/40 focus-visible:ring-primary/30"
            />

            {/* Preview attachments */}
            {(image || video || isUploading) && (
              <div className="relative mt-1 border border-border/50 rounded-lg overflow-hidden max-w-md bg-muted/20">
                {isUploading ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-primary size-8" />
                    <span className="text-xs text-muted-foreground">Uploading media...</span>
                  </div>
                ) : image ? (
                  <div className="relative aspect-video">
                    <img src={image} alt="Upload preview" className="size-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 size-7 shadow-md"
                      onClick={() => setImage(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : video ? (
                  <div className="relative aspect-video bg-black">
                    <video src={video} controls className="size-full object-contain" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 size-7 shadow-md"
                      onClick={() => setVideo(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t border-border/30 pt-3 bg-muted/10">
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || createPostMutation.isPending}
              className="h-8 gap-1.5 text-xs rounded-full font-semibold border-primary/20 hover:border-primary/50 text-foreground"
            >
              <Plus className="size-3.5 text-primary" />
              Add Image/Video
            </Button>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={createPostMutation.isPending || isUploading || !newPostContent.trim()}
            className="px-4 font-semibold"
          >
            {createPostMutation.isPending ? "Posting..." : "Publish Post"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
