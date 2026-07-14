import * as React from "react";
import { Send, CornerDownRight, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Button } from "@oedulms/ui/components/button";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Skeleton } from "@oedulms/ui/components/skeleton";
import { toast } from "sonner";
import { useMe } from "@/api/auth";
import {
  useAddLectureComment,
  useLectureComments,
  useDeleteLectureComment,
  type LectureComment,
} from "@/api/course-player";
import { getInitials } from "@/lib/helper";
import { formatRelativeTime } from "../utils";
import { useConfirm, useConfirmStore } from "@/store/confirm-store";

interface LectureCommentsProps {
  courseId: string;
  lectureId: string;
}

function CommentItem({
  comment,
  replies,
  onReply,
  isReplying,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  isSubmitting,
  onDelete,
  currentUserId,
}: {
  comment: LectureComment;
  replies: LectureComment[];
  onReply: () => void;
  isReplying: boolean;
  replyText: string;
  onReplyTextChange: (v: string) => void;
  onSubmitReply: () => void;
  isSubmitting: boolean;
  onDelete: (id: string) => void;
  currentUserId?: string;
}) {
  const isOptimistic = comment.id.startsWith("optimistic-");
  const isDeleted = comment.isDeleted;

  // Filter out replies that are deleted and have no content to show (if any),
  // but usually we display all replies since they can form a thread.
  return (
    <div
      className={`flex flex-col gap-3 transition-opacity duration-200 ${isOptimistic ? "opacity-60" : ""}`}
    >
      {/* Top-Level Comment Card */}
      <div className="flex gap-3 items-start group/comment">
        <Avatar size="sm" className="shrink-0 border border-border/20 shadow-xs">
          {comment.user.image ? (
            <AvatarImage src={comment.user.image} alt={comment.user.name} />
          ) : null}
          <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-semibold">
            {getInitials(comment.user.name)}
          </AvatarFallback>
        </Avatar>
        <div
          className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-border/50 p-4 shadow-xs transition-colors hover:border-border/80 ${isDeleted ? "bg-muted/10 border-dashed" : "bg-card"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground/90">
              {isDeleted ? "Deleted User" : comment.user.name}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isOptimistic ? (
                <span className="flex items-center gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin" /> Posting...
                </span>
              ) : (
                <span>{formatRelativeTime(comment.createdAt)}</span>
              )}
            </div>
          </div>
          <p
            className={`text-xs leading-relaxed whitespace-pre-wrap ${isDeleted ? "italic text-muted-foreground/60" : "text-muted-foreground"}`}
          >
            {comment.content}
          </p>
          {!isDeleted && (
            <div className="flex gap-2 items-center mt-0.5">
              <button
                type="button"
                onClick={onReply}
                disabled={isOptimistic}
                className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                <MessageSquare className="size-3" />
                Reply
              </button>
              {comment.user.id === currentUserId && !isOptimistic && (
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors ml-auto opacity-0 group-hover/comment:opacity-100"
                >
                  <Trash2 className="size-3" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies Section */}
      {replies.length > 0 && (
        <div className="ml-6 flex flex-col gap-3 border-l-2 border-border/30 pl-4">
          {replies.map((reply) => {
            const isReplyOptimistic = reply.id.startsWith("optimistic-");
            const isReplyDeleted = reply.isDeleted;
            return (
              <div
                key={reply.id}
                className={`flex gap-2.5 items-start group/reply transition-opacity duration-200 ${
                  isReplyOptimistic ? "opacity-60" : ""
                }`}
              >
                <div className="mt-2 shrink-0 text-muted-foreground/40">
                  <CornerDownRight className="size-3.5" />
                </div>
                <Avatar size="sm" className="size-6 shrink-0 border border-border/10">
                  {reply.user.image ? (
                    <AvatarImage src={reply.user.image} alt={reply.user.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/5 text-primary text-[8px] font-semibold">
                    {getInitials(reply.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-border/40 p-3 shadow-2xs transition-colors hover:border-border/60 ${isReplyDeleted ? "bg-muted/10 border-dashed" : "bg-muted/20"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-foreground/95">
                      {isReplyDeleted ? "Deleted User" : reply.user.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      {isReplyOptimistic ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Loader2 className="size-2.5 animate-spin" /> Posting...
                        </span>
                      ) : (
                        <span>{formatRelativeTime(reply.createdAt)}</span>
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed whitespace-pre-wrap ${isReplyDeleted ? "italic text-muted-foreground/60" : "text-muted-foreground/90"}`}
                  >
                    {reply.content}
                  </p>
                  {!isReplyDeleted && reply.user.id === currentUserId && !isReplyOptimistic && (
                    <div className="flex justify-end mt-0.5">
                      <button
                        type="button"
                        onClick={() => onDelete(reply.id)}
                        className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/reply:opacity-100"
                      >
                        <Trash2 className="size-2.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Input Box */}
      {isReplying && !isDeleted && (
        <div className="ml-10 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <Textarea
            placeholder={`Reply to ${comment.user.name}...`}
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            className="min-h-24 text-xs rounded-xl focus-visible:ring-primary/20"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="xs" onClick={onSubmitReply} disabled={!replyText.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Send className="size-3 mr-1" />
              )}
              Send reply
            </Button>
            <Button size="xs" variant="ghost" onClick={onReply}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LectureComments({ courseId, lectureId }: LectureCommentsProps) {
  const confirm = useConfirm();
  const { data: auth } = useMe();
  const { data: comments = [], isLoading } = useLectureComments(courseId, lectureId);
  const addComment = useAddLectureComment(courseId, lectureId);
  const deleteComment = useDeleteLectureComment(courseId, lectureId);

  const [content, setContent] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");

  const topLevel = comments.filter((c) => !c.parentId);
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await addComment.mutateAsync({ content: content.trim() });
      setContent("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    try {
      await addComment.mutateAsync({ content: replyText.trim(), parentId });
      setReplyText("");
      setReplyingTo(null);
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const handleDelete = async (commentId: string) => {
    const isConfirmed = await confirm({
      title: "Delete Comment?",
      desc: "Are you sure you want to delete this comment? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete",
      cancelBtnText: "Cancel",
      closeOnConfirm: false, // Keep dialog open on confirm click
    });

    if (isConfirmed) {
      // Show loading spinner inside the confirm button
      useConfirmStore.getState().setIsLoading(true);

      try {
        await deleteComment.mutateAsync(commentId);
        toast.success("Comment deleted");
      } catch {
        toast.error("Failed to delete comment");
      } finally {
        // Close the confirmation dialog
        useConfirmStore.getState().close();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground/90">Discussion</h3>
        <p className="text-xs text-muted-foreground">
          Share thoughts or ask quick clarifications about this lecture.
        </p>
      </div>

      {/* Composer */}
      <div className="flex gap-3 items-start bg-card border border-border/40 p-4 rounded-xl shadow-2xs">
        <Avatar size="sm" className="shrink-0 border border-border/10 shadow-3xs">
          {auth?.user?.image ? <AvatarImage src={auth.user.image} alt={auth.user.name} /> : null}
          <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-semibold">
            {auth?.user ? getInitials(auth.user.name) : "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Textarea
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-28 text-xs rounded-xl focus-visible:ring-primary/20"
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || addComment.isPending}
            >
              <Send data-icon="inline-start" className="size-3.5" />
              Comment
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-16 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border/60 rounded-xl bg-muted/5">
          <MessageSquare className="size-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground font-medium">
            No comments yet. Be the first to start the discussion!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              isReplying={replyingTo === comment.id}
              replyText={replyText}
              onReplyTextChange={setReplyText}
              onReply={() => {
                setReplyingTo((prev) => (prev === comment.id ? null : comment.id));
                setReplyText("");
              }}
              onSubmitReply={() => handleReply(comment.id)}
              isSubmitting={addComment.isPending}
              onDelete={handleDelete}
              currentUserId={auth?.user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
