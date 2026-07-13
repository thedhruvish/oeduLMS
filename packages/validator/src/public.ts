import { z } from "zod";
import { emailSchema, nameSchema } from "./auth";

export const billingSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  mobile: z
    .string()
    .min(10, { message: "Mobile number must be at least 10 digits" })
    .max(15, { message: "Mobile number must be at most 15 digits" }),
});

export type BillingInput = z.infer<typeof billingSchema>;
