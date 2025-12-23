/**
 * Distributed Rate Limiter - Production-ready rate limiting with Redis support
 *
 * Implements token bucket algorithm for rate limiting auth operations
 * Supports both in-memory (development) and Redis (production) backends
 *
 * Features:
 * - Token bucket algorithm for fair rate limiting
 * - Redis support for distributed deployments
 * - Fallback to in-memory for development
 * - Configurable limits and refill rates
 * - Admin operations (reset, clear)
 * - Monitoring and statistics
 *
 * Usage:
 * ```typescript
 * // Development (in-memory)
 * const limiter = new RateLimiter({ maxTokens: 5, refillRate: 5/3600 })
 *
 * // Production (Redis)
 * const limiter = new RateLimiter({ maxTokens: 5, refillRate: 5/3600 }, redisClient)
 * ```
 */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

// Redis client type - supports redis, ioredis, and other clients
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisClient = any

interface RateLimitConfig {
  maxTokens: number // Maximum tokens in bucket
  refillRate: number // Tokens per second (e.g., 1 token per 600 seconds = 6 per hour)
  refillInterval: number // Refill check interval in milliseconds
  ttl?: number // TTL in seconds for Redis keys (default: 3600)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number // Seconds until next request allowed
}

/**
 * Base rate limiter interface for both in-memory and Redis implementations
 */
interface IRateLimiter {
  isAllowed(key: string): Promise<boolean>
  getRemaining(key: string): Promise<number>
  reset(key: string): Promise<void>
  clearAll(): Promise<void>
  getSize(): Promise<number>
  getStatus(key: string): Promise<RateLimitEntry | null>
}

/**
 * In-memory rate limiter (development)
 * WARNING: Not suitable for production with multiple server instances
 */
class InMemoryRateLimiter implements IRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now()
    const entry = this.store.get(key)

    // Initialize new entry if doesn't exist
    if (!entry) {
      this.store.set(key, {
        tokens: this.config.maxTokens - 1,
        lastRefill: now,
      })
      return true
    }

    // Calculate tokens to add based on time elapsed
    const timePassed = (now - entry.lastRefill) / 1000
    const tokensToAdd = timePassed * this.config.refillRate

    // Update tokens and last refill time
    entry.tokens = Math.min(
      this.config.maxTokens,
      entry.tokens + tokensToAdd
    )
    entry.lastRefill = now

    // Check if we have tokens available
    if (entry.tokens >= 1) {
      entry.tokens -= 1
      return true
    }

    return false
  }

  async getRemaining(key: string): Promise<number> {
    const entry = this.store.get(key)
    if (!entry) return this.config.maxTokens
    return Math.floor(entry.tokens)
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clearAll(): Promise<void> {
    this.store.clear()
  }

  async getSize(): Promise<number> {
    return this.store.size
  }

  async getStatus(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) || null
  }
}

/**
 * Redis-backed rate limiter (production)
 * Supports distributed rate limiting across multiple server instances
 */
class RedisRateLimiter implements IRateLimiter {
  private redisClient: RedisClient
  private config: RateLimitConfig
  private prefix: string

  constructor(config: RateLimitConfig, redisClient: RedisClient, prefix: string = 'ratelimit:') {
    this.config = config
    this.redisClient = redisClient
    this.prefix = prefix
  }

  private getRedisKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async isAllowed(key: string): Promise<boolean> {
    const redisKey = this.getRedisKey(key)
    const now = Date.now()

    try {
      // Get current entry from Redis
      const data = await this.redisClient.get(redisKey)
      let entry: RateLimitEntry

      if (!data) {
        // Initialize new entry
        entry = {
          tokens: this.config.maxTokens - 1,
          lastRefill: now,
        }
      } else {
        entry = JSON.parse(data)

        // Calculate tokens to add based on time elapsed
        const timePassed = (now - entry.lastRefill) / 1000
        const tokensToAdd = timePassed * this.config.refillRate

        // Update tokens
        entry.tokens = Math.min(
          this.config.maxTokens,
          entry.tokens + tokensToAdd
        )
        entry.lastRefill = now
      }

      // Check if we have tokens available
      if (entry.tokens >= 1) {
        entry.tokens -= 1

        // Store updated entry in Redis
        const ttl = this.config.ttl || 3600
        await this.redisClient.setex(
          redisKey,
          ttl,
          JSON.stringify(entry)
        )

        return true
      }

      // Rate limited - update expiry
      const ttl = this.config.ttl || 3600
      await this.redisClient.expire(redisKey, ttl)

      return false
    } catch (error) {
      // SECURITY: Fail closed - deny request if Redis is down
      // This prevents bypass of rate limiting during Redis outages
      // Error tracking: Integration point for monitoring service (Sentry, DataDog, etc.)
      // Note: Using console.error here intentionally as authLogger may not be available
      // in all contexts where rate limiter is used. Error is masked and non-sensitive.
      if (process.env.NODE_ENV === 'development') {
        console.error('[RedisRateLimiter] Redis error - failing closed:', error)
      }
      return false
    }
  }

  async getRemaining(key: string): Promise<number> {
    const redisKey = this.getRedisKey(key)

    try {
      const data = await this.redisClient.get(redisKey)
      if (!data) return this.config.maxTokens

      const entry: RateLimitEntry = JSON.parse(data)
      return Math.floor(entry.tokens)
    } catch {
      // Error tracking: Integration point for monitoring service
      return this.config.maxTokens
    }
  }

  async reset(key: string): Promise<void> {
    const redisKey = this.getRedisKey(key)

    try {
      await this.redisClient.del(redisKey)
    } catch {
      // Error tracking: Integration point for monitoring service
    }
  }

  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.prefix}*`
      const keys = await this.redisClient.keys(pattern)

      if (keys.length > 0) {
        await this.redisClient.del(...keys)
      }
    } catch {
      // Error tracking: Integration point for monitoring service
    }
  }

  async getSize(): Promise<number> {
    try {
      const pattern = `${this.prefix}*`
      const keys = await this.redisClient.keys(pattern)
      return keys.length
    } catch {
      // Error tracking: Integration point for monitoring service
      return 0
    }
  }

  async getStatus(key: string): Promise<RateLimitEntry | null> {
    const redisKey = this.getRedisKey(key)

    try {
      const data = await this.redisClient.get(redisKey)
      if (!data) return null
      return JSON.parse(data)
    } catch {
      // Error tracking: Integration point for monitoring service
      return null
    }
  }
}

/**
 * Factory function to create appropriate rate limiter
 * Uses Redis if available, falls back to in-memory
 */
export function createRateLimiter(
  config: RateLimitConfig,
  redisClient?: RedisClient
): IRateLimiter {
  if (redisClient) {
    return new RedisRateLimiter(config, redisClient)
  }
  return new InMemoryRateLimiter(config)
}

/**
 * High-level API for rate limiting
 * Provides convenient interface for common operations
 */
export class RateLimitManager {
  private limiters: Map<string, IRateLimiter> = new Map()
  private redisClient?: RedisClient

  constructor(redisClient?: RedisClient) {
    this.redisClient = redisClient
  }

  private getOrCreateLimiter(name: string, config: RateLimitConfig): IRateLimiter {
    if (!this.limiters.has(name)) {
      this.limiters.set(name, createRateLimiter(config, this.redisClient))
    }
    return this.limiters.get(name)!
  }

  /**
   * Check if a request is allowed and return detailed result
   */
  async checkLimit(
    limiterName: string,
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const limiter = this.getOrCreateLimiter(limiterName, config)
    const allowed = await limiter.isAllowed(key)
    const remaining = await limiter.getRemaining(key)

    return {
      allowed,
      remaining,
      retryAfter: allowed ? undefined : Math.ceil(1 / config.refillRate),
    }
  }

  /**
   * Get remaining quota for a key
   */
  async getRemaining(
    limiterName: string,
    key: string,
    config: RateLimitConfig
  ): Promise<number> {
    const limiter = this.getOrCreateLimiter(limiterName, config)
    return limiter.getRemaining(key)
  }

  /**
   * Reset rate limit for a key
   */
  async reset(limiterName: string, key: string, config: RateLimitConfig): Promise<void> {
    const limiter = this.getOrCreateLimiter(limiterName, config)
    return limiter.reset(key)
  }

  /**
   * Get detailed status for debugging
   */
  async getStats(): Promise<Record<string, { entries: number; limiter: string }>> {
    const stats: Record<string, { entries: number; limiter: string }> = {}

    for (const [name, limiter] of this.limiters) {
      stats[name] = {
        entries: await limiter.getSize(),
        limiter: this.redisClient ? 'Redis' : 'In-Memory',
      }
    }

    return stats
  }
}

/**
 * Export singleton instance
 * Can be replaced with Redis-backed instance in production
 */
export const defaultRateLimitManager = new RateLimitManager()

/**
 * Convenience functions for backward compatibility
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<boolean> {
  const result = await defaultRateLimitManager.checkLimit('default', key, config)
  return result.allowed
}

export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return defaultRateLimitManager.checkLimit('default', key, config)
}

export async function resetRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  return defaultRateLimitManager.reset('default', key, config)
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR OTP & PASSWORD RESET RATE LIMITING
// These use centralized configurations from constants/rate-limits.ts
// ============================================================================

import { RATE_LIMITS } from './constants/rate-limits'

// Create dedicated limiter instances for auth operations
const otpLimiter = createRateLimiter(RATE_LIMITS.otpRequest)
const passwordResetLimiter = createRateLimiter(RATE_LIMITS.passwordReset)
const ipLimiter = createRateLimiter(RATE_LIMITS.ipBased)

/**
 * Check if an OTP request is allowed for an email/phone
 * Uses centralized RATE_LIMITS.otpRequest configuration
 * @param identifier - Email or phone number
 * @returns Promise<boolean> - true if allowed, false if rate limited
 */
export async function checkOtpRateLimit(identifier: string): Promise<boolean> {
  const key = `otp:${identifier.toLowerCase()}`
  return otpLimiter.isAllowed(key)
}

/**
 * Check if a password reset request is allowed for an email
 * Uses centralized RATE_LIMITS.passwordReset configuration
 * @param email - Email address
 * @returns Promise<boolean> - true if allowed, false if rate limited
 */
export async function checkPasswordResetRateLimit(email: string): Promise<boolean> {
  const key = `reset:${email.toLowerCase()}`
  return passwordResetLimiter.isAllowed(key)
}

/**
 * Check if a general auth request is allowed from an IP
 * Uses centralized RATE_LIMITS.ipBased configuration
 * @param ip - IP address
 * @returns Promise<boolean> - true if allowed, false if rate limited
 */
export async function checkIpRateLimit(ip: string): Promise<boolean> {
  const key = `ip:${ip}`
  return ipLimiter.isAllowed(key)
}

/**
 * Get remaining OTP requests for an identifier
 * @param identifier - Email or phone number
 * @returns Promise<number> - Number of remaining requests
 */
export async function getOtpRateLimitRemaining(identifier: string): Promise<number> {
  const key = `otp:${identifier.toLowerCase()}`
  return otpLimiter.getRemaining(key)
}

/**
 * Reset OTP rate limit for an identifier (admin operation)
 * @param identifier - Email or phone number
 */
export async function resetOtpRateLimit(identifier: string): Promise<void> {
  const key = `otp:${identifier.toLowerCase()}`
  return otpLimiter.reset(key)
}

/**
 * Reset password reset rate limit for an email (admin operation)
 * @param email - Email address
 */
export async function resetPasswordResetRateLimit(email: string): Promise<void> {
  const key = `reset:${email.toLowerCase()}`
  return passwordResetLimiter.reset(key)
}

/**
 * Reset IP rate limit (admin operation)
 * @param ip - IP address
 */
export async function resetIpRateLimit(ip: string): Promise<void> {
  const key = `ip:${ip}`
  return ipLimiter.reset(key)
}

/**
 * Get monitoring stats for rate limiters
 */
export async function getRateLimiterStats(): Promise<{
  otp: { entries: number; config: string }
  passwordReset: { entries: number; config: string }
  ip: { entries: number; config: string }
}> {
  return {
    otp: {
      entries: await otpLimiter.getSize(),
      config: `Max ${RATE_LIMITS.otpRequest.maxTokens} requests per hour per email/phone`,
    },
    passwordReset: {
      entries: await passwordResetLimiter.getSize(),
      config: `Max ${RATE_LIMITS.passwordReset.maxTokens} requests per hour per email`,
    },
    ip: {
      entries: await ipLimiter.getSize(),
      config: `Max ${RATE_LIMITS.ipBased.maxTokens} requests per minute per IP`,
    },
  }
}
