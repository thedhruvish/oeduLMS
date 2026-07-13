import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/features/public/layout/public-layout";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});
