import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@oedulms/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { Button } from "@oedulms/ui/components/button";
import { authClient } from "@/lib/auth-client";

interface VerifyEmailProps {
  token?: string;
}

export function VerifyEmail({ token }: VerifyEmailProps) {
  const [status, setStatus] = React.useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error"
  );
  const [error, setError] = React.useState<string | null>(
    token ? null : "No verification token provided. Please check the link in your email."
  );
  const [email, setEmail] = React.useState("");
  const [resendLoading, setResendLoading] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  const verifyEmail = React.useCallback(async (verifyToken: string) => {
    setStatus("verifying");
    setError(null);
    try {
      const { error: verifyError } = await authClient.verifyEmail({
        query: {
          token: verifyToken,
        },
      });

      if (verifyError) {
        setStatus("error");
        setError(verifyError.message || "Failed to verify email.");
      } else {
        setStatus("success");
      }
    } catch (err: unknown) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred during verification."
      );
    }
  }, []);

  React.useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setResendLoading(true);
    setResendSuccess(false);
    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/auth/login`,
      });

      if (resendError) {
        toast.error(resendError.message || "Failed to send verification email.");
      } else {
        toast.success("Verification email sent successfully!");
        setResendSuccess(true);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setResendLoading(false);
    }
  };

  if (status === "verifying") {
    return (
      <Card className="w-full sm:max-w-md mx-auto">
        <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">Verifying your email</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we confirm your email address...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="w-full sm:max-w-md mx-auto">
        <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
              Email Verified Successfully!
            </h3>
            <p className="text-sm text-muted-foreground">
              Thank you for verifying your email address. Your account is now fully active.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" render={<Link to="/auth/login" />}>
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full sm:max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertTriangle className="size-5" />
          <CardTitle className="text-lg">Verification Failed</CardTitle>
        </div>
        <CardDescription>{error}</CardDescription>
      </CardHeader>
      <form onSubmit={handleResend}>
        <CardContent className="flex flex-col gap-4">
          <div className="text-xs text-muted-foreground border-t pt-4">
            If your verification link expired or is invalid, you can request a new one below:
          </div>

          {resendSuccess && (
            <div className="p-3 text-xs text-green-600 bg-green-500/10 border border-green-500/20 rounded-md">
              A new verification link has been sent to <strong>{email}</strong>. Please check your
              spam folder if you do not see it in a few minutes.
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="resend-email">Email Address</FieldLabel>
              <div className="relative">
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={resendLoading}
                  className="pl-9"
                  required
                />
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" type="submit" disabled={resendLoading}>
            {resendLoading && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Resend Verification Link
          </Button>
          <div className="text-xs text-center text-muted-foreground w-full">
            Back to{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
