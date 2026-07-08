import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

interface ResetPasswordSearch {
  token?: string;
}

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
    };
  },
  component: ResetPasswordComponent,
});

function ResetPasswordComponent() {
  const { token } = Route.useSearch();

  if (!token) {
    return (
      <div className="text-destructive font-medium text-center" role="alert">
        Error: Invalid or missing password reset token.
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
