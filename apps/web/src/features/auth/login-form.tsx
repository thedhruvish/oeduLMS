import { useForm } from "@tanstack/react-form";
import { useNavigate, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loginSchema } from "@oedulms/validator/auth";
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
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
import { useLogin } from "@/api/auth";
import { authClient } from "@/lib/auth-client";
import * as React from "react";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const login = useLogin();
  const [resendLoading, setResendLoading] = React.useState(false);

  const handleResendVerification = async () => {
    const emailValue = form.state.values.email;
    if (!emailValue) {
      toast.error("Please enter your email address first.");
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: emailValue,
        callbackURL: `${window.location.origin}/auth/login`,
      });

      if (error) {
        toast.error(error.message || "Failed to send verification email.");
      } else {
        toast.success("Verification email sent successfully! Please check your inbox.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setResendLoading(false);
    }
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const authData = await login.mutateAsync({
          email: value.email,
          password: value.password,
        });

        toast.success("Successfully logged in!");

        if (onSuccess) {
          onSuccess();
        }

        if (authData.role === "TEACHER") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/dash" });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        toast.error(message);
      }
    },
  });

  return (
    <Card className="w-full sm:max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <form
        id="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <CardContent className="flex flex-col gap-4">
          {login.error?.message && (
            <div
              className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex flex-col gap-2"
              role="alert"
            >
              <span>{login.error.message}</span>
              {(login.error as { code?: string }).code === "EMAIL_NOT_VERIFIED" && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-xs text-primary font-semibold underline hover:text-primary/80 transition text-left cursor-pointer flex items-center gap-1.5"
                >
                  {resendLoading && <Loader2 className="size-3 animate-spin" />}
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <FieldGroup>
            <form.Field name="email">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      placeholder="you@example.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={login.isPending}
                      autoComplete="email"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex justify-between items-center w-full">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Link
                        to="/auth/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      placeholder="••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={login.isPending}
                      autoComplete="current-password"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit" disabled={login.isPending}>
            {login.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Sign In
          </Button>
          <div className="text-sm text-center text-muted-foreground w-full">
            Don&apos;t have an account?{" "}
            <Link to="/auth/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
