import { createDb } from "@oedulms/db";
import * as schema from "@oedulms/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendResetPasswordEmail, sendVerificationEmail } from "./utils/resend";

export { sendResetPasswordEmail, sendVerificationEmail };

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [],
    emailAndPassword: {
      requireEmailVerification: true,
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail({ email: user.email, url });
      },
    },
    emailVerification: {
      enabled: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail({ email: user.email, url });
      },
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
  });
}

