import type { Context } from "hono";
import type { AppVariables } from "../types";

export interface CacheService {
  get<T>(c: Context<AppVariables>, key: string): Promise<T | null>;
  set<T>(c: Context<AppVariables>, key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(c: Context<AppVariables>, key: string): Promise<void>;
}

export const cacheService: CacheService = {
  get: async <T>(c: Context<AppVariables>, key: string): Promise<T | null> => {
    if (!c.env.PROTECH_KV) return null;
    const data = await c.env.PROTECH_KV.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  set: async <T>(c: Context<AppVariables>, key: string, value: T, ttlSeconds: number): Promise<void> => {
    if (!c.env.PROTECH_KV) return;
    await c.env.PROTECH_KV.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
  },

  delete: async (c: Context<AppVariables>, key: string): Promise<void> => {
    if (!c.env.PROTECH_KV) return;
    await c.env.PROTECH_KV.delete(key);
  },
};
