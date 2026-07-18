import { createDb } from "@oedulms/db";
import * as schema from "@oedulms/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendResetPasswordEmail, sendVerificationEmail } from "./utils/resend";

export { sendResetPasswordEmail, sendVerificationEmail };

interface SecondaryKVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createAuth(env?: Record<string, unknown>) {
  const db = createDb();

  const envRecord = (env || process.env) as unknown as Record<string, unknown>;
  const globalRecord = globalThis as unknown as Record<string, unknown>;
  const authKv = (envRecord.PROTECH_KV || globalRecord.PROTECH_KV) as SecondaryKVStore | undefined;

  const secondaryStorage = authKv
    ? {
        get: async (key: string) => {
          return await authKv.get(key);
        },
        set: async (key: string, value: string, ttl?: number) => {
          let expirationTtl = ttl;
          if (expirationTtl !== undefined && expirationTtl < 60) {
            expirationTtl = 600; // Cloudflare KV expiration_ttl must be at least 60 seconds
          }
          const options = expirationTtl ? { expirationTtl } : undefined;
          await authKv.put(key, value, options);
        },
        delete: async (key: string) => {
          await authKv.delete(key);
        },
      }
    : undefined;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    ...(secondaryStorage ? { secondaryStorage } : {}),
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
      storage: "secondary-storage",
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
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
  });
}
