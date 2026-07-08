import { z } from "zod";

// Reusable, secure field validations compatible with Zod v4 non-deprecated signatures
export const emailSchema = z
  .email({ message: "Invalid email address" })
  .min(5, { message: "Email must be at least 5 characters" })
  .max(255, { message: "Email must be at most 255 characters" });

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be at most 72 characters" });
// .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
// .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
// .regex(/[0-9]/, { message: "Password must contain at least one number" })
// .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character" });

export const nameSchema = z
  .string()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(50, { message: "Name must be at most 50 characters" })
  .regex(/^[a-zA-Z\s\-']+$/, { message: "Name contains invalid characters" });

// Unified schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: nameSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
