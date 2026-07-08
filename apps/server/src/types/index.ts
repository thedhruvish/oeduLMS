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
export type AppVariables = {
  Variables: EvlogVariables["Variables"] & {
    sessionUser: SessionUser;
    userRole: "STUDENT" | "TEACHER";
  };
};
