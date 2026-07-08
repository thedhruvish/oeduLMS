import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/features/auth/register-form";

export const Route = createFileRoute("/auth/register")({
  component: RegisterComponent,
});

function RegisterComponent() {
  return <RegisterForm />;
}
