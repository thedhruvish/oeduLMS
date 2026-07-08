import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordComponent,
});

function ForgotPasswordComponent() {
  return <ForgotPasswordForm />;
}
