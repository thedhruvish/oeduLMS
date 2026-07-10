import { z } from "zod";

export const enrollmentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  courseId: z.uuid("Course must be a valid UUID"),
  status: z.enum(["active", "completed", "refunded"]).default("active"),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
