import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Button } from "@oedulms/ui/components/button";
import { Send } from "lucide-react";
import { useAddComment, FeedPost } from "@/api/feed";
import { StudentHoverCard } from "./student-hover-card";
import { toast } from "sonner";
import { getInitials } from "@/lib/helper";

interface CommentSectionProps {
  post: FeedPost;
  user: { name: string; image?: string | null } | null;
}

export function CommentSection({ post, user }: CommentSectionProps) {
  const addCommentMutation = useAddComment();
  const [commentInput, setCommentInput] = React.useState("");
  const [replyingToCommentId, setReplyingToCommentId] = React.useState<string | null>(null);
  const [replyInputs, setReplyInputs] = React.useState<Record<string, string>>({});

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;

    try {
      await addCommentMutation.mutateAsync({ postId: post.id, comment: commentInput });
      setCommentInput("");
    } catch {
      toast.error("Failed to add comment.");
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    const text = replyInputs[parentCommentId];
    if (!text || !text.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        postId: post.id,
        comment: text,
        parentId: parentCommentId,
      });
      setReplyInputs((prev) => ({ ...prev, [parentCommentId]: "" }));
      setReplyingToCommentId(null);
      toast.success("Reply added!");
    } catch {
      toast.error("Failed to add reply.");
    }
  };

  return (
    <div className="bg-muted/10 px-6 py-4 flex flex-col gap-4 border-b border-border/30">
      {/* Comments list */}
      {post.comments && post.comments.length > 0 ? (
        <div className="flex flex-col gap-5 max-h-80 overflow-y-auto pr-1">
          {post.comments
            .filter((c) => !c.parentId)
            .map((comment) => {
              const replies = post.comments.filter((r) => r.parentId === comment.id);
              return (
                <div key={comment.id} className="flex flex-col gap-2">
                  {/* Parent Comment */}
                  <div className="flex gap-3 text-xs items-start">
                    <StudentHoverCard
                      userId={comment.user.id}
                      userName={comment.user.name}
                      userImage={comment.user.image}
                    >
                      <Avatar className="size-8 border shrink-0">
                        {comment.user.image ? (
                          <AvatarImage src={comment.user.image} alt={comment.user.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </StudentHoverCard>
                    <div className="flex flex-col flex-grow bg-card p-3 rounded-(--radius-xl) border border-border/30">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{comment.user.name}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
                        {comment.comment}
                      </p>
                      <button
                        onClick={() =>
                          setReplyingToCommentId(
                            replyingToCommentId === comment.id ? null : comment.id
                          )
                        }
                        className="text-[10px] text-primary font-semibold hover:underline mt-1.5 self-start flex items-center gap-1"
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  {/* Nested Replies List */}
                  {replies.length > 0 && (
                    <div className="pl-8 border-l border-border/60 flex flex-col gap-3 ml-4">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2 text-xs items-start">
                          <StudentHoverCard
                            userId={reply.user.id}
                            userName={reply.user.name}
                            userImage={reply.user.image}
                          >
                            <Avatar className="size-6 border shrink-0">
                              {reply.user.image ? (
                                <AvatarImage src={reply.user.image} alt={reply.user.name} />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[9px]">
                                {getInitials(reply.user.name)}
                              </AvatarFallback>
                            </Avatar>
                          </StudentHoverCard>
                          <div className="flex flex-col flex-grow bg-card p-2.5 rounded-(--radius-xl) border border-border/20">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {reply.user.name}
                              </span>
                              <span className="text-[8px] text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
                              {reply.comment}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input Box */}
                  {replyingToCommentId === comment.id && (
                    <div className="flex gap-2.5 mt-1 pl-11 items-center w-full">
                      <Avatar className="size-6 border shrink-0">
                        {user?.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[9px]">
                          {user ? getInitials(user.name) : "S"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-grow flex gap-2">
                        <input
                          type="text"
                          placeholder={`Reply to ${comment.user.name}...`}
                          value={replyInputs[comment.id] || ""}
                          onChange={(e) =>
                            setReplyInputs((prev) => ({
                              ...prev,
                              [comment.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddReply(comment.id);
                          }}
                          className="flex-grow bg-card border border-border/40 focus:border-primary/50 focus:outline-none rounded-(--radius-lg) px-3 py-1 text-xs"
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyInputs[comment.id]?.trim()}
                          className="h-8 text-primary hover:text-primary-hover font-semibold"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground text-center py-2">
          No comments yet. Be the first to join the conversation!
        </span>
      )}

      {/* Add comment input */}
      <div className="flex gap-3 mt-1">
        <Avatar className="size-8 border shrink-0">
          {user?.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
            {user ? getInitials(user.name) : "S"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-grow flex gap-2">
          <input
            type="text"
            placeholder="Write a comment..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddComment();
            }}
            className="flex-grow bg-card border border-border/40 focus:border-primary/50 focus:outline-none rounded-(--radius-xl) px-4 text-xs"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAddComment}
            disabled={!commentInput.trim()}
            className="size-8 text-primary hover:text-primary-hover shrink-0"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
