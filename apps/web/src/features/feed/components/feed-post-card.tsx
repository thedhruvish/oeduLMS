import * as React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@oedulms/ui/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Button } from "@oedulms/ui/components/button";
import { Heart, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { useToggleLike, useDeletePost, FeedPost } from "@/api/feed";
import { CommentSection } from "./comment-section";
import { StudentHoverCard } from "./student-hover-card";
import { useConfirm, useConfirmStore } from "@/store/confirm-store";
import { toast } from "sonner";
import { getInitials } from "@/lib/helper";

interface FeedPostCardProps {
  post: FeedPost;
  user: { id?: string; name: string; image?: string | null } | null;
}

export function FeedPostCard({ post, user }: FeedPostCardProps) {
  const [showComments, setShowComments] = React.useState(false);
  const toggleLikeMutation = useToggleLike();
  const deletePostMutation = useDeletePost();
  const confirm = useConfirm();

  const handleToggleLike = async () => {
    try {
      await toggleLikeMutation.mutateAsync(post.id);
    } catch {
      toast.error("Could not complete action.");
    }
  };

  const handleDeletePost = async () => {
    const isConfirmed = await confirm({
      title: "Delete Post?",
      desc: "Are you sure you want to delete this post? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete",
      cancelBtnText: "Cancel",
      closeOnConfirm: false,
    });

    if (!isConfirmed) return;

    useConfirmStore.getState().setIsLoading(true);

    try {
      await deletePostMutation.mutateAsync(post.id);
      toast.success("Post deleted successfully.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      useConfirmStore.getState().close();
    }
  };

  return (
    <Card className="border border-border/40 hover:border-border/80 shadow-none hover:shadow-sm transition duration-200 overflow-hidden animate-in fade-in duration-200">
      {/* Post Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3.5">
          <StudentHoverCard
            userId={post.author.id}
            userName={post.author.name}
            userImage={post.author.image}
          >
            <Avatar className="size-10 border shrink-0">
              {post.author.image ? (
                <AvatarImage src={post.author.image} alt={post.author.name} />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-primary font-bold text-xs">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
          </StudentHoverCard>
          <div className="flex flex-col gap-0.5 select-none">
            <span className="text-sm font-semibold text-foreground leading-none">
              {post.author.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Delete Post Button (Author Only) */}
        {user?.id === post.author.id && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDeletePost}
            disabled={deletePostMutation.isPending}
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer transition"
          >
            {deletePostMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        )}
      </CardHeader>

      {/* Post Content */}
      <CardContent className="pb-4 text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-3">
        <div>{post.content}</div>

        {/* Render Image Attachment */}
        {post.image && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border/40 max-w-2xl bg-muted/10">
            <img
              src={post.image}
              alt="Post attachment"
              className="max-h-[450px] w-full object-cover"
            />
          </div>
        )}

        {/* Render Video Attachment */}
        {post.video && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border/40 max-w-2xl bg-black">
            <video src={post.video} controls className="max-h-[450px] w-full object-contain" />
          </div>
        )}
      </CardContent>

      {/* Action Bar */}
      <CardFooter className="flex gap-6 border-t border-b border-border/30 py-2.5 px-6 text-xs text-muted-foreground select-none bg-muted/5">
        <button
          onClick={handleToggleLike}
          className={`flex items-center gap-1.5 font-medium hover:text-red-500 transition-colors ${
            post.isLiked ? "text-red-500 font-semibold" : ""
          }`}
        >
          <Heart className={`size-4 ${post.isLiked ? "fill-current" : ""}`} />
          <span>
            {post.likesCount} {post.likesCount === 1 ? "Like" : "Likes"}
          </span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 font-medium hover:text-primary transition-colors ${
            showComments ? "text-primary font-semibold" : ""
          }`}
        >
          <MessageSquare className="size-4" />
          <span>
            {post.commentsCount} {post.commentsCount === 1 ? "Comment" : "Comments"}
          </span>
        </button>
      </CardFooter>

      {/* Comments Section */}
      {showComments && <CommentSection post={post} user={user} />}
    </Card>
  );
}
