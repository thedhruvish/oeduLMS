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
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get("token") || "";
        const origin = process.env.CORS_ORIGIN?.replace(/\/$/, "") || "";
        const resetUrl = origin ? `${origin}/auth/reset-password?token=${token}` : url;
        await sendResetPasswordEmail({ email: user.email, url: resetUrl });
      },
    },
    emailVerification: {
      enabled: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get("token") || "";
        const origin = process.env.CORS_ORIGIN?.replace(/\/$/, "") || "";
        const verifyUrl = origin ? `${origin}/auth/verify-email?token=${token}` : url;
        await sendVerificationEmail({ email: user.email, url: verifyUrl });
      },
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/send-verification-email": {
          window: 60,
          max: 3,
        },
        "/forget-password": {
          window: 60,
          max: 3,
        },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
  });
}
