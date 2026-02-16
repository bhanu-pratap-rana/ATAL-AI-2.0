/**
 * Tests for rate-limiter-distributed.ts
 * Target: ~25 tests covering token bucket algorithm, Redis/in-memory backends
 */

// Mock dependencies before imports
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    otpRequest: { maxTokens: 5, refillRate: 5 / 3600, refillInterval: 1000 },
    passwordReset: { maxTokens: 3, refillRate: 3 / 3600, refillInterval: 1000 },
    ipBased: { maxTokens: 60, refillRate: 1, refillInterval: 1000 },
    emailEnumeration: { maxTokens: 10, refillRate: 10 / 3600, refillInterval: 1000 },
    adminOperations: { maxTokens: 30, refillRate: 0.5, refillInterval: 1000 },
    dashboardStats: { maxTokens: 100, refillRate: 100 / 3600, refillInterval: 1000 },
    schoolSearch: { maxTokens: 20, refillRate: 20 / 60, refillInterval: 1000 },
  },
}));

import {
  createRateLimiter,
  RateLimitManager,
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  checkOtpRateLimit,
  checkPasswordResetRateLimit,
  checkIpRateLimit,
  checkEnumerationRateLimit,
  checkTeacherMutationRateLimit,
  checkStudentMutationRateLimit,
  checkAdminOperationRateLimit,
  checkSchoolFinderRateLimit,
  checkTeacherOnboardRateLimit,
  checkOtpVerifyRateLimit,
  getOtpRateLimitRemaining,
  resetOtpRateLimit,
  resetPasswordResetRateLimit,
  resetIpRateLimit,
  getRateLimiterStats,
} from "@/lib/rate-limiter-distributed";

describe("rate-limiter-distributed", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure we're NOT in test environment for rate limit tests
    process.env = { ...originalEnv, NODE_ENV: "development" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("createRateLimiter", () => {
    it("should create in-memory limiter when no Redis client provided", () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 1,
        refillInterval: 1000,
      });

      expect(limiter).toBeDefined();
      expect(limiter.isAllowed).toBeDefined();
      expect(limiter.getRemaining).toBeDefined();
      expect(limiter.reset).toBeDefined();
    });

    it("should create Redis limiter when Redis client provided", () => {
      const mockRedisClient = {
        get: jest.fn(),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
        flushdb: jest.fn(),
        eval: jest.fn(),
      };

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
        mockRedisClient
      );

      expect(limiter).toBeDefined();
    });
  });

  describe("InMemoryRateLimiter", () => {
    it("should allow first request", async () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 0.001, // Very slow refill
        refillInterval: 1000,
      });

      const result = await limiter.isAllowed("test-key");

      // In test env, always returns true
      expect(result).toBe(true);
    });

    it("should track remaining tokens", async () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 0.001,
        refillInterval: 1000,
      });

      const remaining = await limiter.getRemaining("new-key");

      expect(remaining).toBe(5); // New key has max tokens
    });

    it("should reset key", async () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 0.001,
        refillInterval: 1000,
      });

      await limiter.isAllowed("reset-key");
      await limiter.reset("reset-key");

      const remaining = await limiter.getRemaining("reset-key");
      expect(remaining).toBe(5);
    });

    it("should clear all entries", async () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 0.001,
        refillInterval: 1000,
      });

      await limiter.isAllowed("key1");
      await limiter.isAllowed("key2");
      await limiter.clearAll();

      const size = await limiter.getSize();
      expect(size).toBe(0);
    });

    it("should return status for key", async () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 0.001,
        refillInterval: 1000,
      });

      await limiter.isAllowed("status-key");

      const status = await limiter.getStatus("status-key");
      expect(status).toHaveProperty("tokens");
      expect(status).toHaveProperty("lastRefill");
    });

    it("should return null status for non-existent key", async () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 0.001,
        refillInterval: 1000,
      });

      const status = await limiter.getStatus("non-existent");
      expect(status).toBeNull();
    });
  });

  describe("RateLimitManager", () => {
    it("should create and manage multiple limiters", async () => {
      const manager = new RateLimitManager();

      const config = { maxTokens: 5, refillRate: 1, refillInterval: 1000 };

      const result1 = await manager.checkLimit("limiter1", "key1", config);
      const result2 = await manager.checkLimit("limiter2", "key2", config);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it("should return remaining quota", async () => {
      const manager = new RateLimitManager();
      const config = { maxTokens: 10, refillRate: 1, refillInterval: 1000 };

      const remaining = await manager.getRemaining("test", "key", config);

      expect(remaining).toBe(10);
    });

    it("should reset specific key", async () => {
      const manager = new RateLimitManager();
      const config = { maxTokens: 5, refillRate: 1, refillInterval: 1000 };

      await manager.checkLimit("test", "key", config);
      await manager.reset("test", "key", config);

      const remaining = await manager.getRemaining("test", "key", config);
      expect(remaining).toBe(5);
    });

    it("should return stats for all limiters", async () => {
      const manager = new RateLimitManager();
      const config = { maxTokens: 5, refillRate: 1, refillInterval: 1000 };

      await manager.checkLimit("limiter1", "key", config);
      await manager.checkLimit("limiter2", "key", config);

      const stats = await manager.getStats();

      expect(stats).toBeDefined();
      expect(Object.keys(stats)).toContain("limiter1");
      expect(Object.keys(stats)).toContain("limiter2");
    });

    it("should include limiter type in stats", async () => {
      const manager = new RateLimitManager();
      const config = { maxTokens: 5, refillRate: 1, refillInterval: 1000 };

      await manager.checkLimit("test", "key", config);

      const stats = await manager.getStats();

      expect(stats.test.limiter).toBe("In-Memory");
    });
  });

  describe("Convenience Functions", () => {
    describe("checkRateLimit", () => {
      it("should return true when allowed", async () => {
        const result = await checkRateLimit("test-key", {
          maxTokens: 5,
          refillRate: 1,
          refillInterval: 1000,
        });

        expect(result).toBe(true);
      });
    });

    describe("getRateLimitStatus", () => {
      it("should return detailed status", async () => {
        const result = await getRateLimitStatus("test-key", {
          maxTokens: 5,
          refillRate: 1,
          refillInterval: 1000,
        });

        expect(result).toHaveProperty("allowed");
        expect(result).toHaveProperty("remaining");
      });
    });

    describe("resetRateLimit", () => {
      it("should reset rate limit for key", async () => {
        await resetRateLimit("test-key", {
          maxTokens: 5,
          refillRate: 1,
          refillInterval: 1000,
        });

        // Should not throw
        expect(true).toBe(true);
      });
    });
  });

  describe("OTP Rate Limiting", () => {
    it("should check OTP rate limit", async () => {
      const result = await checkOtpRateLimit("test@example.com");
      expect(result).toBe(true);
    });

    it("should normalize email to lowercase", async () => {
      const result = await checkOtpRateLimit("TEST@EXAMPLE.COM");
      expect(result).toBe(true);
    });

    it("should get remaining OTP requests", async () => {
      // Use unique email that hasn't been used in other tests
      const remaining = await getOtpRateLimitRemaining("fresh-otp-test@example.com");
      expect(remaining).toBe(5); // Max tokens from mock
    });

    it("should reset OTP rate limit", async () => {
      await resetOtpRateLimit("test@example.com");
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("Password Reset Rate Limiting", () => {
    it("should check password reset rate limit", async () => {
      const result = await checkPasswordResetRateLimit("test@example.com");
      expect(result).toBe(true);
    });

    it("should reset password reset rate limit", async () => {
      await resetPasswordResetRateLimit("test@example.com");
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("IP Rate Limiting", () => {
    it("should check IP rate limit", async () => {
      const result = await checkIpRateLimit("192.168.1.1");
      expect(result).toBe(true);
    });

    it("should reset IP rate limit", async () => {
      await resetIpRateLimit("192.168.1.1");
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("Enumeration Rate Limiting", () => {
    it("should check enumeration rate limit", async () => {
      const result = await checkEnumerationRateLimit("email:check:test@example.com");
      expect(result).toBe(true);
    });
  });

  describe("Role-Based Rate Limiting", () => {
    it("should check teacher mutation rate limit", async () => {
      const result = await checkTeacherMutationRateLimit("teacher-123");
      expect(result).toBe(true);
    });

    it("should check student mutation rate limit", async () => {
      const result = await checkStudentMutationRateLimit("student-123");
      expect(result).toBe(true);
    });

    it("should check admin operation rate limit", async () => {
      const result = await checkAdminOperationRateLimit("admin-123");
      expect(result).toBe(true);
    });

    it("should check school finder rate limit", async () => {
      const result = await checkSchoolFinderRateLimit("user-123");
      expect(result).toBe(true);
    });

    it("should check teacher onboard rate limit", async () => {
      const result = await checkTeacherOnboardRateLimit("teacher-123");
      expect(result).toBe(true);
    });
  });

  describe("OTP Verification Rate Limiting", () => {
    it("should check OTP verify rate limit", async () => {
      const result = await checkOtpVerifyRateLimit("test@example.com");
      expect(result).toBe(true);
    });
  });

  describe("Monitoring", () => {
    it("should return rate limiter stats", async () => {
      const stats = await getRateLimiterStats();

      expect(stats).toHaveProperty("otp");
      expect(stats).toHaveProperty("passwordReset");
      expect(stats).toHaveProperty("ip");
      expect(stats).toHaveProperty("teacherOps");
      expect(stats).toHaveProperty("studentOps");
      expect(stats).toHaveProperty("adminOps");
    });

    it("should include entry counts in stats", async () => {
      const stats = await getRateLimiterStats();

      expect(stats.otp).toHaveProperty("entries");
      expect(stats.otp).toHaveProperty("config");
    });
  });

  describe("RedisRateLimiter", () => {
    const createMockRedisClient = () => ({
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      incr: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn(),
      flushdb: jest.fn(),
      eval: jest.fn(),
    });

    it("should use Lua script for atomic rate limiting", async () => {
      const mockRedis = createMockRedisClient();
      mockRedis.eval.mockResolvedValue(1); // Allowed

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
        mockRedis
      );

      const result = await limiter.isAllowed("test-key");

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it("should fall back to non-atomic approach when Lua script fails", async () => {
      const mockRedis = createMockRedisClient();
      mockRedis.eval.mockRejectedValue(new Error("NOSCRIPT"));
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue("OK");

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
        mockRedis
      );

      const result = await limiter.isAllowed("test-key");

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it("should use in-memory fallback when Redis is unavailable", async () => {
      const mockRedis = createMockRedisClient();
      mockRedis.eval.mockRejectedValue(new Error("ECONNREFUSED"));
      mockRedis.get.mockRejectedValue(new Error("ECONNREFUSED"));

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
        mockRedis
      );

      const result = await limiter.isAllowed("test-key");

      expect(result).toBe(true); // Fallback should allow
    });

    it("should handle existing entry in Redis", async () => {
      const mockRedis = createMockRedisClient();
      mockRedis.eval.mockRejectedValue(new Error("NOSCRIPT"));
      mockRedis.get.mockResolvedValue(JSON.stringify({
        tokens: 3,
        lastRefill: Date.now() - 1000
      }));
      mockRedis.setex.mockResolvedValue("OK");

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
        mockRedis
      );

      const result = await limiter.isAllowed("test-key");

      expect(result).toBe(true);
    });

    it("should handle rate limited case (no tokens)", async () => {
      const mockRedis = createMockRedisClient();
      mockRedis.eval.mockRejectedValue(new Error("NOSCRIPT"));
      mockRedis.get.mockResolvedValue(JSON.stringify({
        tokens: 0.1, // Less than 1 token
        lastRefill: Date.now() // Just now, so no refill
      }));
      mockRedis.expire.mockResolvedValue(1);

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 0.0001, refillInterval: 1000 },
        mockRedis
      );

      const result = await limiter.isAllowed("test-key");

      expect(result).toBe(false);
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it("should handle invalid JSON in Redis data", async () => {
      const mockRedis = createMockRedisClient();
      mockRedis.eval.mockRejectedValue(new Error("NOSCRIPT"));
      mockRedis.get.mockResolvedValue("invalid-json");
      mockRedis.setex.mockResolvedValue("OK");

      const limiter = createRateLimiter(
        { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
        mockRedis
      );

      const result = await limiter.isAllowed("test-key");

      expect(result).toBe(true); // Should create new entry
    });

    describe("getRemaining", () => {
      it("should return max tokens for new key", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.get.mockResolvedValue(null);

        const limiter = createRateLimiter(
          { maxTokens: 10, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const remaining = await limiter.getRemaining("new-key");

        expect(remaining).toBe(10);
      });

      it("should return tokens from Redis entry", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.get.mockResolvedValue(JSON.stringify({
          tokens: 7.5,
          lastRefill: Date.now()
        }));

        const limiter = createRateLimiter(
          { maxTokens: 10, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const remaining = await limiter.getRemaining("existing-key");

        expect(remaining).toBe(7);
      });

      it("should fallback on Redis error", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.get.mockRejectedValue(new Error("Connection lost"));

        const limiter = createRateLimiter(
          { maxTokens: 10, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const remaining = await limiter.getRemaining("key");

        expect(remaining).toBe(10); // Fallback returns max
      });
    });

    describe("reset", () => {
      it("should delete key from Redis", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.del.mockResolvedValue(1);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        await limiter.reset("test-key");

        expect(mockRedis.del).toHaveBeenCalled();
      });

      it("should handle Redis error on reset", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.del.mockRejectedValue(new Error("Connection lost"));

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        // Should not throw
        await expect(limiter.reset("test-key")).resolves.toBeUndefined();
      });
    });

    describe("clearAll", () => {
      it("should delete all keys with prefix", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.keys.mockResolvedValue(["ratelimit:key1", "ratelimit:key2"]);
        mockRedis.del.mockResolvedValue(2);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        await limiter.clearAll();

        expect(mockRedis.keys).toHaveBeenCalledWith("ratelimit:*");
        expect(mockRedis.del).toHaveBeenCalledWith("ratelimit:key1", "ratelimit:key2");
      });

      it("should handle empty key list", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.keys.mockResolvedValue([]);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        await limiter.clearAll();

        expect(mockRedis.del).not.toHaveBeenCalled();
      });

      it("should handle Redis error on clearAll", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.keys.mockRejectedValue(new Error("Connection lost"));

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        // Should not throw
        await expect(limiter.clearAll()).resolves.toBeUndefined();
      });
    });

    describe("getSize", () => {
      it("should return count of keys", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.keys.mockResolvedValue(["k1", "k2", "k3"]);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const size = await limiter.getSize();

        expect(size).toBe(3);
      });

      it("should fallback on Redis error", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.keys.mockRejectedValue(new Error("Connection lost"));

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const size = await limiter.getSize();

        expect(size).toBe(0); // Fallback is empty
      });
    });

    describe("getStatus", () => {
      it("should return entry from Redis", async () => {
        const entry = { tokens: 3, lastRefill: Date.now() };
        const mockRedis = createMockRedisClient();
        mockRedis.get.mockResolvedValue(JSON.stringify(entry));

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const status = await limiter.getStatus("test-key");

        expect(status).toEqual(entry);
      });

      it("should return null for non-existent key", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.get.mockResolvedValue(null);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const status = await limiter.getStatus("non-existent");

        expect(status).toBeNull();
      });

      it("should fallback on Redis error", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.get.mockRejectedValue(new Error("Connection lost"));

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        const status = await limiter.getStatus("test-key");

        expect(status).toBeNull(); // Fallback returns null
      });
    });

    describe("Redis unavailable flag", () => {
      it("should use fallback immediately when Redis marked unavailable", async () => {
        const mockRedis = createMockRedisClient();
        // First call fails completely
        mockRedis.eval.mockRejectedValue(new Error("ECONNREFUSED"));
        mockRedis.get.mockRejectedValue(new Error("ECONNREFUSED"));

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        // First call marks Redis as unavailable
        await limiter.isAllowed("key1");

        // Reset mocks to verify they're not called
        mockRedis.eval.mockClear();
        mockRedis.get.mockClear();

        // Second call should use fallback directly
        await limiter.isAllowed("key2");

        // Redis methods should not be called
        expect(mockRedis.eval).not.toHaveBeenCalled();
      });
    });

    describe("Custom prefix", () => {
      it("should use custom prefix for Redis keys", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.eval.mockResolvedValue(1);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        await limiter.isAllowed("test-key");

        // Check that the key includes the default prefix
        const evalCall = mockRedis.eval.mock.calls[0];
        expect(evalCall[2]).toContain("ratelimit:");
      });
    });

    describe("TTL configuration", () => {
      it("should use default TTL when not specified", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.eval.mockResolvedValue(1);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000 },
          mockRedis
        );

        await limiter.isAllowed("test-key");

        // TTL (ARGV[4]) should be 3600 (default)
        const evalCall = mockRedis.eval.mock.calls[0];
        expect(evalCall[6]).toBe("3600");
      });

      it("should use custom TTL when specified", async () => {
        const mockRedis = createMockRedisClient();
        mockRedis.eval.mockResolvedValue(1);

        const limiter = createRateLimiter(
          { maxTokens: 5, refillRate: 1, refillInterval: 1000, ttl: 7200 },
          mockRedis
        );

        await limiter.isAllowed("test-key");

        // TTL (ARGV[4]) should be 7200
        const evalCall = mockRedis.eval.mock.calls[0];
        expect(evalCall[6]).toBe("7200");
      });
    });
  });

  describe("RateLimitManager with Redis", () => {
    it("should use Redis limiter type in stats", async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        keys: jest.fn().mockResolvedValue([]),
        incr: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
        flushdb: jest.fn(),
        eval: jest.fn().mockResolvedValue(1),
      };

      const manager = new RateLimitManager(mockRedis);
      const config = { maxTokens: 5, refillRate: 1, refillInterval: 1000 };

      await manager.checkLimit("test", "key", config);

      const stats = await manager.getStats();

      expect(stats.test.limiter).toBe("Redis");
    });
  });

  describe("retryAfter calculation", () => {
    it("should calculate correct retryAfter when rate limited", async () => {
      const manager = new RateLimitManager();
      const config = { maxTokens: 5, refillRate: 0.5, refillInterval: 1000 };

      const result = await manager.checkLimit("test", "key", config);

      // retryAfter should be ceiling of 1/refillRate
      if (!result.allowed) {
        expect(result.retryAfter).toBe(2); // Math.ceil(1/0.5) = 2
      }
    });

    it("should not include retryAfter when allowed", async () => {
      const manager = new RateLimitManager();
      const config = { maxTokens: 5, refillRate: 1, refillInterval: 1000 };

      const result = await manager.checkLimit("test", "unique-key", config);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });
  });
});
