import type { EvlogVariables } from "evlog/hono";

// The User shape returned by Better Auth session
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Merged Hono type — merges evlog's log variable with our own app variables
// Bindings maps to the Cloudflare Worker env interface (wrangler-generated CloudflareBindings)
export type AppVariables = {
  Bindings: CloudflareBindings;
  Variables: EvlogVariables["Variables"] & {
    sessionUser: SessionUser;
    userRole: "STUDENT" | "TEACHER";
  };
};
