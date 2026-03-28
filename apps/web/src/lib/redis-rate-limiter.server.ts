/**
 * Redis-backed rate limiter — SERVER ONLY
 *
 * This module is safe to import from server actions and API routes.
 * It MUST NOT be imported by client components or files they transitively import,
 * because ioredis is a Node.js-only package.
 *
 * When REDIS_URL is set, rate limits are shared across all Vercel instances
 * (Valkey/Redis-backed). Falls back to in-memory if Redis is unavailable.
 *
 * Key patterns and limits match rate-limiter-distributed.ts exactly so that
 * in-memory (dev) and Redis (prod) share the same semantics.
 *
 * Usage in server actions:
 *   import { checkOtpRateLimit } from "@/lib/redis-rate-limiter.server";
 */
import "server-only";

import { Redis } from "ioredis";
import { authLogger } from "./auth-logger";
import { RateLimitManager } from "./rate-limiter-distributed";
import type { RateLimitConfig } from "./rate-limiter-distributed";
import { RATE_LIMITS } from "./constants/rate-limits";

// ── Singleton Redis-backed manager (reused across warm starts) ────────────────

let _manager: RateLimitManager | null = null;

function getManager(): RateLimitManager {
  if (_manager) return _manager;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const client = new Redis(redisUrl, {
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
      authLogger.info("[RateLimit] Redis/Valkey backend initialised");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _manager = new RateLimitManager(client as any);
      return _manager;
    } catch (err) {
      authLogger.warn("[RateLimit] ioredis init failed — falling back to in-memory", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  _manager = new RateLimitManager();
  return _manager;
}

function sanitize(input: string): string {
  return encodeURIComponent(input.toLowerCase().trim());
}

// ── Convenience wrappers matching key patterns in rate-limiter-distributed.ts ─

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<boolean> {
  const result = await getManager().checkLimit("default", key, config);
  return result.allowed;
}

/** 5 OTP requests per hour per email/phone */
export async function checkOtpRateLimit(identifier: string): Promise<boolean> {
  return checkRateLimit(`otp:${sanitize(identifier)}`, RATE_LIMITS.otpRequest);
}

/** 5 OTP verify attempts per 15 minutes (brute-force prevention) */
export async function checkOtpVerifyRateLimit(identifier: string): Promise<boolean> {
  return checkRateLimit(
    `otp:verify:${identifier.toLowerCase()}`,
    { maxTokens: 5, refillRate: 5 / 900, refillInterval: 1000 },
  );
}

/** Password reset rate limit */
export async function checkPasswordResetRateLimit(email: string): Promise<boolean> {
  return checkRateLimit(`reset:${sanitize(email)}`, RATE_LIMITS.passwordReset);
}

/** Email enumeration prevention */
export async function checkEnumerationRateLimit(key: string): Promise<boolean> {
  return checkRateLimit(key, RATE_LIMITS.emailEnumeration);
}
