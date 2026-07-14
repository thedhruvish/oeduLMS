import { createFileRoute } from "@tanstack/react-router";
import { FeedView } from "@/features/feed/components/feed-view";

export const Route = createFileRoute("/admin/feed")({
  component: FeedView,
});
