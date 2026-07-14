import * as React from "react";
import { useFeedPosts } from "@/api/feed";
import { useAuth } from "@/api/auth";
import { Card } from "@oedulms/ui/components/card";
import { CreatePostCard } from "./create-post-card";
import { FeedPostCard } from "./feed-post-card";
import { Skeleton } from "@oedulms/ui/components/skeleton";

export function FeedView() {
  const { user, role } = useAuth();
  const { data: feedData, isLoading } = useFeedPosts();

  const posts = feedData?.posts || [];
  const allowStudentPosts = feedData?.allowStudentPosts ?? true;
  const isStudent = role === "STUDENT";
  const canPost = !isStudent || allowStudentPosts;

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-12 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Social Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share insights, ask questions, or connect with instructors and peer students.
        </p>
      </div>

      {/* Share / Create Post Box */}
      {canPost ? (
        <CreatePostCard user={user} />
      ) : (
        <Card className="border border-yellow-500/20 bg-yellow-500/5 text-yellow-800 dark:text-yellow-200 p-5 rounded-(--radius-xl) flex items-center gap-3">
          <span className="text-sm font-medium">
            Posting on the community feed has been disabled by the course administrator.
          </span>
        </Card>
      )}

      {/* Feed Stream */}
      {isLoading ? (
        <div className="flex flex-col gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <FeedPostCard key={post.id} post={post} user={user} />
          ))}
        </div>
      ) : (
        <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/10">
          No posts in the feed yet. Start the conversation by sharing something!
        </div>
      )}
    </div>
  );
}
