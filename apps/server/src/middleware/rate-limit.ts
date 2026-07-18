import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "../types";

interface RateLimiterOptions {
  limit: number;       // Max requests within the window
  windowSeconds: number; // Duration of the window in seconds
}

/**
 * Hono middleware to rate limit request rates per IP address using Cloudflare KV.
 */
export function rateLimiter(options: RateLimiterOptions): MiddlewareHandler<AppVariables> {
  return async (c, next) => {
    // If KV is not bound, skip rate limiting to avoid blocking requests
    if (!c.env.PROTECH_KV) {
      await next();
      return;
    }

    // Extract client IP address (Cloudflare connecting IP priority)
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("x-real-ip") ||
      c.req.header("x-forwarded-for") ||
      "127.0.0.1";

    // Use current time window identifier to chunk rates (e.g. by minute)
    const now = Date.now();
    const windowId = Math.floor(now / (options.windowSeconds * 1000));
    const key = `rate_limit:${ip}:${windowId}`;

    try {
      const currentVal = await c.env.PROTECH_KV.get(key);
      const count = currentVal ? parseInt(currentVal, 10) : 0;

      if (count >= options.limit) {
        c.header("Retry-After", String(options.windowSeconds));
        return c.json(
          { error: "Too many requests. Please try again later." },
          429
        );
      }

      // Increment count. Cloudflare KV requires expiration TTL to be at least 60 seconds.
      const expirationTtl = Math.max(60, options.windowSeconds);
      await c.env.PROTECH_KV.put(key, String(count + 1), {
        expirationTtl,
      });

      // Append standard rate limiting headers
      c.header("X-RateLimit-Limit", String(options.limit));
      c.header("X-RateLimit-Remaining", String(options.limit - count - 1));
    } catch (err: unknown) {
      // In case of KV lookup issues, log but allow the request to proceed so users are not blocked
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Rate limiter failure:", msg);
    }

    await next();
  };
}
