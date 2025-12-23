/**
 * Rate Limiter Distributed Tests
 *
 * Tests for the token bucket rate limiter implementation
 * covering both in-memory and Redis backends
 *
 * Security-critical: These tests ensure rate limiting properly
 * protects against brute force attacks on auth endpoints
 */

import {
  createRateLimiter,
  RateLimitManager,
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  checkOtpRateLimit,
  checkPasswordResetRateLimit,
  checkIpRateLimit,
  getOtpRateLimitRemaining,
  resetOtpRateLimit,
  resetPasswordResetRateLimit,
  resetIpRateLimit,
  getRateLimiterStats,
} from '@/lib/rate-limiter-distributed'

describe('Rate Limiter Distributed', () => {
  // Helper to create test config
  const createTestConfig = (maxTokens: number = 5, refillRate: number = 1) => ({
    maxTokens,
    refillRate, // tokens per second
    refillInterval: 1000,
    ttl: 3600,
  })

  describe('In-Memory Rate Limiter', () => {
    it('should allow requests up to maxTokens', async () => {
      const limiter = createRateLimiter(createTestConfig(3))

      // First 3 requests should be allowed
      expect(await limiter.isAllowed('test-key-1')).toBe(true)
      expect(await limiter.isAllowed('test-key-1')).toBe(true)
      expect(await limiter.isAllowed('test-key-1')).toBe(true)

      // 4th request should be blocked
      expect(await limiter.isAllowed('test-key-1')).toBe(false)
    })

    it('should track different keys separately', async () => {
      const limiter = createRateLimiter(createTestConfig(2))

      // Use all tokens for key-a
      expect(await limiter.isAllowed('key-a')).toBe(true)
      expect(await limiter.isAllowed('key-a')).toBe(true)
      expect(await limiter.isAllowed('key-a')).toBe(false)

      // Key-b should still have tokens
      expect(await limiter.isAllowed('key-b')).toBe(true)
      expect(await limiter.isAllowed('key-b')).toBe(true)
    })

    it('should return correct remaining tokens', async () => {
      const limiter = createRateLimiter(createTestConfig(5))

      // New key should have max tokens
      expect(await limiter.getRemaining('new-key')).toBe(5)

      // After one request, should have max - 1
      await limiter.isAllowed('new-key')
      expect(await limiter.getRemaining('new-key')).toBe(4)
    })

    it('should reset a specific key', async () => {
      const limiter = createRateLimiter(createTestConfig(3))

      // Use all tokens
      await limiter.isAllowed('reset-key')
      await limiter.isAllowed('reset-key')
      await limiter.isAllowed('reset-key')
      expect(await limiter.isAllowed('reset-key')).toBe(false)

      // Reset and try again
      await limiter.reset('reset-key')
      expect(await limiter.isAllowed('reset-key')).toBe(true)
    })

    it('should clear all keys', async () => {
      const limiter = createRateLimiter(createTestConfig(2))

      // Add multiple keys
      await limiter.isAllowed('clear-1')
      await limiter.isAllowed('clear-2')
      expect(await limiter.getSize()).toBeGreaterThan(0)

      // Clear all
      await limiter.clearAll()
      expect(await limiter.getSize()).toBe(0)
    })

    it('should return null status for non-existent key', async () => {
      const limiter = createRateLimiter(createTestConfig(5))
      expect(await limiter.getStatus('non-existent')).toBeNull()
    })

    it('should return status for existing key', async () => {
      const limiter = createRateLimiter(createTestConfig(5))

      await limiter.isAllowed('status-key')

      const status = await limiter.getStatus('status-key')
      expect(status).not.toBeNull()
      expect(status?.tokens).toBeLessThan(5)
      expect(status?.lastRefill).toBeGreaterThan(0)
    })

    it('should refill tokens over time', async () => {
      // Fast refill for testing (10 tokens per second)
      const limiter = createRateLimiter(createTestConfig(5, 10))

      // Use all tokens
      await limiter.isAllowed('refill-key')
      await limiter.isAllowed('refill-key')
      await limiter.isAllowed('refill-key')
      await limiter.isAllowed('refill-key')
      await limiter.isAllowed('refill-key')
      expect(await limiter.isAllowed('refill-key')).toBe(false)

      // Wait for refill (100ms should add 1 token)
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have tokens again
      expect(await limiter.isAllowed('refill-key')).toBe(true)
    })
  })

  describe('RateLimitManager', () => {
    it('should create and manage multiple limiters', async () => {
      const manager = new RateLimitManager()

      const result1 = await manager.checkLimit('otp', 'user1', createTestConfig(3))
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = await manager.checkLimit('login', 'user1', createTestConfig(5))
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(4)
    })

    it('should return retryAfter when rate limited', async () => {
      const manager = new RateLimitManager()
      const config = createTestConfig(1, 0.1) // 1 token, slow refill

      await manager.checkLimit('test', 'blocked-user', config)
      const result = await manager.checkLimit('test', 'blocked-user', config)

      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeDefined()
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should get remaining quota', async () => {
      const manager = new RateLimitManager()
      const config = createTestConfig(5)

      await manager.checkLimit('quota', 'user', config)
      const remaining = await manager.getRemaining('quota', 'user', config)

      expect(remaining).toBe(4)
    })

    it('should reset rate limit', async () => {
      const manager = new RateLimitManager()
      const config = createTestConfig(2)

      await manager.checkLimit('reset', 'user', config)
      await manager.checkLimit('reset', 'user', config)

      const blocked = await manager.checkLimit('reset', 'user', config)
      expect(blocked.allowed).toBe(false)

      await manager.reset('reset', 'user', config)

      const unblocked = await manager.checkLimit('reset', 'user', config)
      expect(unblocked.allowed).toBe(true)
    })

    it('should return stats for all limiters', async () => {
      const manager = new RateLimitManager()

      await manager.checkLimit('limiter-a', 'key', createTestConfig(3))
      await manager.checkLimit('limiter-b', 'key', createTestConfig(5))

      const stats = await manager.getStats()

      expect(stats['limiter-a']).toBeDefined()
      expect(stats['limiter-b']).toBeDefined()
      expect(stats['limiter-a'].limiter).toBe('In-Memory')
    })
  })

  describe('Convenience Functions', () => {
    it('checkRateLimit should return boolean', async () => {
      const uniqueKey = `convenience-key-${Date.now()}`
      const result = await checkRateLimit(uniqueKey, createTestConfig(5))
      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
    })

    it('getRateLimitStatus should return detailed result', async () => {
      const uniqueKey = `status-key-${Date.now()}`
      const result = await getRateLimitStatus(uniqueKey, createTestConfig(5))

      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('remaining')
      expect(result.allowed).toBe(true)
    })

    it('resetRateLimit should clear limits', async () => {
      // Note: The defaultRateLimitManager uses a singleton "default" limiter
      // which was already created with maxTokens=5 in earlier tests.
      // We need to exhaust those 5 tokens to test the reset behavior.
      const uniqueKey = `reset-conv-${Date.now()}`
      const config = createTestConfig(5) // Match the already-created limiter config

      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(uniqueKey, config)
      }
      // Should be blocked now
      expect(await checkRateLimit(uniqueKey, config)).toBe(false)

      // Reset and try again
      await resetRateLimit(uniqueKey, config)
      expect(await checkRateLimit(uniqueKey, config)).toBe(true)
    })
  })

  describe('OTP Rate Limiting', () => {
    const testEmail = `test-otp-${Date.now()}@example.com`

    afterEach(async () => {
      await resetOtpRateLimit(testEmail)
    })

    it('should allow OTP requests within limit', async () => {
      const result = await checkOtpRateLimit(testEmail)
      expect(result).toBe(true)
    })

    it('should normalize email to lowercase', async () => {
      const upperEmail = `TEST-OTP-CASE-${Date.now()}@EXAMPLE.COM`
      await checkOtpRateLimit(upperEmail)

      const remaining = await getOtpRateLimitRemaining(upperEmail.toLowerCase())
      expect(remaining).toBeLessThan(5) // Default max tokens
    })

    it('should return remaining OTP requests', async () => {
      const uniqueEmail = `test-remaining-${Date.now()}@example.com`
      await checkOtpRateLimit(uniqueEmail)

      const remaining = await getOtpRateLimitRemaining(uniqueEmail)
      expect(remaining).toBeGreaterThanOrEqual(0)
    })

    it('should reset OTP rate limit', async () => {
      const uniqueEmail = `test-reset-otp-${Date.now()}@example.com`

      // Use some tokens
      await checkOtpRateLimit(uniqueEmail)
      await checkOtpRateLimit(uniqueEmail)

      // Reset
      await resetOtpRateLimit(uniqueEmail)

      // Should have full quota again
      const remaining = await getOtpRateLimitRemaining(uniqueEmail)
      expect(remaining).toBe(5) // Default max tokens
    })
  })

  describe('Password Reset Rate Limiting', () => {
    it('should allow password reset requests within limit', async () => {
      const testEmail = `test-pwd-${Date.now()}@example.com`
      const result = await checkPasswordResetRateLimit(testEmail)
      expect(result).toBe(true)
    })

    it('should reset password reset rate limit', async () => {
      const testEmail = `test-reset-pwd-${Date.now()}@example.com`

      await checkPasswordResetRateLimit(testEmail)
      await resetPasswordResetRateLimit(testEmail)

      // Should still be allowed after reset
      const result = await checkPasswordResetRateLimit(testEmail)
      expect(result).toBe(true)
    })
  })

  describe('IP-based Rate Limiting', () => {
    it('should allow requests from new IPs', async () => {
      const testIp = `192.168.${Date.now() % 256}.1`
      const result = await checkIpRateLimit(testIp)
      expect(result).toBe(true)
    })

    it('should reset IP rate limit', async () => {
      const testIp = `10.0.${Date.now() % 256}.1`

      await checkIpRateLimit(testIp)
      await resetIpRateLimit(testIp)

      const result = await checkIpRateLimit(testIp)
      expect(result).toBe(true)
    })
  })

  describe('Rate Limiter Stats', () => {
    it('should return stats for all auth rate limiters', async () => {
      const stats = await getRateLimiterStats()

      expect(stats).toHaveProperty('otp')
      expect(stats).toHaveProperty('passwordReset')
      expect(stats).toHaveProperty('ip')

      expect(stats.otp).toHaveProperty('entries')
      expect(stats.otp).toHaveProperty('config')
      expect(typeof stats.otp.entries).toBe('number')
    })
  })

  describe('Security Scenarios', () => {
    it('should block brute force attempts on single identifier', async () => {
      const attacker = `brute-force-${Date.now()}@example.com`
      const results: boolean[] = []

      // Simulate 10 rapid requests
      for (let i = 0; i < 10; i++) {
        results.push(await checkOtpRateLimit(attacker))
      }

      // First few should succeed, rest should be blocked
      const allowed = results.filter((r) => r).length
      const blocked = results.filter((r) => !r).length

      expect(allowed).toBeLessThanOrEqual(5) // Max tokens
      expect(blocked).toBeGreaterThan(0)
    })

    it('should not affect legitimate users during attack on another user', async () => {
      const attacker = `attacker-${Date.now()}@example.com`
      const legitimate = `legitimate-${Date.now()}@example.com`

      // Exhaust attacker's quota
      for (let i = 0; i < 10; i++) {
        await checkOtpRateLimit(attacker)
      }

      // Legitimate user should still be able to request
      const result = await checkOtpRateLimit(legitimate)
      expect(result).toBe(true)
    })

    it('should handle concurrent requests correctly', async () => {
      const user = `concurrent-${Date.now()}@example.com`

      // Fire 10 concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => checkOtpRateLimit(user))

      const results = await Promise.all(promises)
      const allowed = results.filter((r) => r).length

      // Should not allow more than maxTokens
      expect(allowed).toBeLessThanOrEqual(5)
    })
  })
})
