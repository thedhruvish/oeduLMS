import { z } from "zod";

export const faqSchema = z.object({
  question: z.string().min(5, { message: "Question must be at least 5 characters" }),
  answer: z.string().min(5, { message: "Answer must be at least 5 characters" }),
});

export type FaqInput = z.infer<typeof faqSchema>;

export const courseSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must be at most 100 characters" }),
  shortDescription: z
    .string()
    .max(250, { message: "Short description must be at most 250 characters" })
    .optional()
    .or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  price: z.number().min(0, { message: "Price must be a non-negative number" }),
  discountPrice: z
    .number()
    .min(0, { message: "Discount price must be a non-negative number" })
    .optional()
    .nullable(),
  currency: z.string(),
  thumbnail: z.url({ message: "Thumbnail must be a valid URL" }).optional().or(z.literal("")),
  trailerVideo: z
    .url({ message: "Trailer video must be a valid URL" })
    .optional()
    .or(z.literal("")),
  durationSeconds: z.number().int().min(0),
  totalLectures: z.number().int().min(0),
  certificateEnabled: z.boolean(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  language: z.string().optional().or(z.literal("")),
  validateDays: z.number().int().min(1).optional().nullable(),
  faqs: z.array(faqSchema).optional(),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type CreateCourseInput = CourseInput;
export type UpdateCourseInput = Partial<CourseInput>;

export const sectionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  isPublished: z.boolean(),
});

export type SectionInput = z.infer<typeof sectionSchema>;

export const lectureSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional().nullable(),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  thumbnail: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  duration: z.number().int().min(0),
  isPreview: z.boolean(),
  isPublished: z.boolean(),
  position: z.number().int().min(0).optional(),
});

export type LectureInput = z.infer<typeof lectureSchema>;
