import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { forgotPasswordSchema } from "@oedulms/validator/auth";
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
import { useForgotPassword } from "@/api/auth";

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [isSent, setIsSent] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await forgotPassword.mutateAsync({
          email: value.email,
        });

        setIsSent(true);
        toast.success("Password reset instructions sent to your email!");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        toast.error(message);
      }
    },
  });

  if (isSent) {
    return (
      <Card className="w-full sm:max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Check your Email</CardTitle>
          <CardDescription>
            We have sent password reset instructions to your email address. Check the console logs
            of your server for the local link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Once you get the link, click it to set a new password.
          </p>
        </CardContent>
        <CardFooter>
          <Link to="/auth/login" className="w-full">
            <Button className="w-full" variant="outline">
              Back to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full sm:max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <CardContent className="flex flex-col gap-4">
          {forgotPassword.error?.message && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md" role="alert">
              {forgotPassword.error.message}
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
                      disabled={forgotPassword.isPending}
                      autoComplete="email"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending && (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            )}
            Send Reset Link
          </Button>
          <div className="text-sm text-center text-muted-foreground w-full">
            Remember your password?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
