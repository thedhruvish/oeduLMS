import { createFileRoute } from "@tanstack/react-router";
import { FeedView } from "@/features/feed/components/feed-view";

export const Route = createFileRoute("/dash/feed")({
  component: FeedView,
});
