import { createFileRoute } from "@tanstack/react-router";
import { FastCheckoutPage } from "@/features/public/courses/fast-checkout-page";

export const Route = createFileRoute("/fast-checkout/$slug")({
  component: FastCheckoutPage,
});
