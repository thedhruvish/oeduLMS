# Form Design System Guide

This document details how forms are created and managed in this codebase, including form state management, validation, accessibility, and visual animations.

## Form Philosophy
- **Headless State & Validation**: Powered by `@tanstack/react-form` + Zod schemas for type-safety and real-time validation.
- **Shared Validation Package**: Zod schemas are explicitly defined in the shared `@oedulms/validator` package (e.g. `@oedulms/validator/auth`) to keep the schemas DRY across frontend and backend environments.
- **Accessibility & Semantics**: Uses standard Shadcn `<Field>` components (`FieldGroup`, `Field`, `FieldLabel`) to manage accessibility attributes (`aria-invalid`, `data-invalid`, `htmlFor`, `id`).
- **Direct Error Rendering**: No transformation or formatting of error messages is performed inside the form or error components. If the form library provides errors in the shape expected by `<FieldError>`, they are passed directly:
  ```tsx
  <FieldError errors={field.state.meta.errors} />
  ```
  This is the most efficient approach because it completely avoids any run-time transformation.
- **Encapsulated Error UI**: `<FormError>` animates the entrance/exit transitions of the errors using height/opacity animations, forwarding the `errors` directly without modifications.
- **Password Toggle**: Utilizes `<PasswordInput>` to toggle visible characters.

---

## Schema Imports
All validation schemas are imported directly from the workspace validator package:
```typescript
import { loginSchema, registerSchema } from "@oedulms/validator/auth";
```

---

## Code Example

Here is a simple profile setting form using the standard design pattern:

```tsx
import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@oedulms/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";
import { Input } from "@oedulms/ui/components/input";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";

// 1. Zod schemas are imported from @oedulms/validator/auth
import { userSettingsSchema } from "@oedulms/validator/auth";

export function UserSettingsForm() {
  // 2. Set up TanStack Form with form-level Zod validators
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    validators: {
      onChange: userSettingsSchema,
    },
    onSubmit: async ({ value }) => {
      toast.success("Settings saved successfully!");
    },
  });

  return (

      
      <form
        id="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
          <FieldGroup>
            {/* Input Field */}
            <form.Field name="username">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Enter username"
                    />
                    {/* Error component forwards ValidationError[] directly */}
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Password input field */}
            <form.Field name="password">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Security Password</FieldLabel>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="••••••••"
                    />
                    {/* Error component forwards ValidationError[] directly */}
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" form="settings-form">
            Save Changes
          </Button>
  );
}
```
