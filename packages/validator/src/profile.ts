import { z } from "zod";

export const studentProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  headline: z.string().max(200, "Headline cannot exceed 200 characters"),
  bio: z.string().max(2000, "Bio cannot exceed 2000 characters"),
  phone: z.string().max(20, "Phone number is too long"),
  country: z.string().max(100, "Country name is too long"),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

// Keep backward compat for backend / API payloads
export const profileUpdateScheme = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  headline: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  image: z.url().optional(),
});

export type ProfileUpdateType = z.infer<typeof profileUpdateScheme>;
