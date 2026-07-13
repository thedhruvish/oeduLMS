import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/public/home/home-page";

export const Route = createFileRoute("/_public/home")({
  component: HomePage,
});
