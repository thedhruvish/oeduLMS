# Validator Development Guide

This document is a guide on how to create, define, export, and consume validator schemas inside the `@oedulms/validator` package.

## Package Location & Structure
The validator package is a shared workspace package located at `packages/validator`.

```
packages/validator/
├── package.json         # Package configuration & exports
├── tsconfig.json        # TypeScript configuration
└── src/
    ├── index.ts         # Global package entrypoint (re-exports modules)
    └── auth.ts          # Authentication schema definitions
```

---

## How to Create a New Validator Schema

Follow these steps to define a new validation schema (for example, a `course` schema):

### Step 1: Define Schemas in a new file (`src/course.ts`)
Create a new file in `src/` to house your schemas. Define reusable fields first, build the object schema, and export its inferred TypeScript type:

```typescript
import { z } from "zod";

// 1. Define reusable field constraints (Zod v4 parameters)
export const courseTitleSchema = z
  .string()
  .min(3, { message: "Course title must be at least 3 characters" })
  .max(100, { message: "Course title must be at most 100 characters" });

export const coursePriceSchema = z
  .number()
  .min(0, { message: "Price cannot be negative" });

// 2. Build compound validation schema
export const createCourseSchema = z.object({
  title: courseTitleSchema,
  price: coursePriceSchema,
});

// 3. Export the inferred TypeScript type
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
```

### Step 2: Export from the Package Entrypoint
Re-export your schemas from [packages/validator/src/index.ts](file:///home/debian/Desktop/coding/lmsoedu/oedulms/packages/validator/src/index.ts) to make them part of the general import options:

```typescript
export * from "./auth";
export * from "./course"; // Add your new schema export
```



---

## Consuming Schemas in the Codebase

### Frontend (React / TanStack Form)
Import your schema directly and assign it to the form-level `validators.onChange` property:

```tsx
import { useForm } from "@tanstack/react-form";
import { createCourseSchema } from "@oedulms/validator/course";

const form = useForm({
  defaultValues: { title: "", price: 0 },
  validators: {
    onChange: createCourseSchema,
  },
  onSubmit: async ({ value }) => { ... }
});
```

### Backend (Hono / Server endpoints)
Use Hono's `@hono/zod-validator` middleware to validate request payloads (JSON body, query params, etc.) dynamically before the handler executes:

```typescript
import { zValidator } from "@hono/zod-validator";
import { createCourseSchema } from "@oedulms/validator/course";

app.post("/api/courses", zValidator("json", createCourseSchema), async (c) => {
  // Payload is verified, parsed, and strongly-typed
  const courseData = c.req.valid("json");
  ...
});
```
