/**
 * Tests for rate-limits constants
 * Target: ~20 tests covering all rate limit configurations
 */

import {
  RATE_LIMITS,
  OTP_LIMITS,
  WINDOW_LIMITS,
  type RateLimitConfig,
} from "@/lib/constants/rate-limits";

describe("RATE_LIMITS", () => {
  describe("schoolSearch", () => {
    it("should have maxTokens of 30", () => {
      expect(RATE_LIMITS.schoolSearch.maxTokens).toBe(30);
    });

    it("should have refill interval of 1000ms", () => {
      expect(RATE_LIMITS.schoolSearch.refillInterval).toBe(1000);
    });

    it("should have refillRate allowing 30 per hour", () => {
      expect(RATE_LIMITS.schoolSearch.refillRate).toBeCloseTo(30 / 3600, 5);
    });
  });

  describe("studentSearch", () => {
    it("should have maxTokens of 30", () => {
      expect(RATE_LIMITS.studentSearch.maxTokens).toBe(30);
    });

    it("should have same limits as schoolSearch", () => {
      expect(RATE_LIMITS.studentSearch.maxTokens).toBe(
        RATE_LIMITS.schoolSearch.maxTokens
      );
    });
  });

  describe("teacherVerification", () => {
    it("should have strict limit of 5 attempts", () => {
      expect(RATE_LIMITS.teacherVerification.maxTokens).toBe(5);
    });

    it("should be stricter than school search", () => {
      expect(RATE_LIMITS.teacherVerification.maxTokens).toBeLessThan(
        RATE_LIMITS.schoolSearch.maxTokens
      );
    });
  });

  describe("otpRequest", () => {
    it("should have maxTokens of 5", () => {
      expect(RATE_LIMITS.otpRequest.maxTokens).toBe(5);
    });
  });

  describe("passwordReset", () => {
    it("should have very strict limit of 3", () => {
      expect(RATE_LIMITS.passwordReset.maxTokens).toBe(3);
    });

    it("should be stricter than OTP request", () => {
      expect(RATE_LIMITS.passwordReset.maxTokens).toBeLessThan(
        RATE_LIMITS.otpRequest.maxTokens
      );
    });
  });

  describe("ipBased", () => {
    it("should have 10 requests per minute", () => {
      expect(RATE_LIMITS.ipBased.maxTokens).toBe(10);
    });

    it("should have faster refill rate for per-minute limit", () => {
      expect(RATE_LIMITS.ipBased.refillRate).toBeCloseTo(10 / 60, 5);
    });
  });

  describe("adminOperations", () => {
    it("should have 10 requests per minute", () => {
      expect(RATE_LIMITS.adminOperations.maxTokens).toBe(10);
    });
  });

  describe("classJoinAttempts", () => {
    it("should have strict limit of 5", () => {
      expect(RATE_LIMITS.classJoinAttempts.maxTokens).toBe(5);
    });
  });

  describe("aiTutorChat", () => {
    it("should have 30 requests per hour", () => {
      expect(RATE_LIMITS.aiTutorChat.maxTokens).toBe(30);
    });
  });

  describe("tts", () => {
    it("should have 50 requests per hour", () => {
      expect(RATE_LIMITS.tts.maxTokens).toBe(50);
    });

    it("should be more generous than AI chat", () => {
      expect(RATE_LIMITS.tts.maxTokens).toBeGreaterThan(
        RATE_LIMITS.aiTutorChat.maxTokens
      );
    });
  });

  describe("pinRotation", () => {
    it("should have 10 requests per hour", () => {
      expect(RATE_LIMITS.pinRotation.maxTokens).toBe(10);
    });
  });

  describe("assessmentSubmission", () => {
    it("should have 20 requests per hour", () => {
      expect(RATE_LIMITS.assessmentSubmission.maxTokens).toBe(20);
    });
  });

  describe("dashboardStats", () => {
    it("should have generous 60 requests per hour", () => {
      expect(RATE_LIMITS.dashboardStats.maxTokens).toBe(60);
    });
  });

  describe("adminMetrics", () => {
    it("should have 30 requests per hour", () => {
      expect(RATE_LIMITS.adminMetrics.maxTokens).toBe(30);
    });
  });

  describe("emailEnumeration", () => {
    it("should have 20 requests per hour", () => {
      expect(RATE_LIMITS.emailEnumeration.maxTokens).toBe(20);
    });
  });

  describe("all rate limits", () => {
    it("should have consistent refillInterval of 1000ms", () => {
      Object.values(RATE_LIMITS).forEach((config: RateLimitConfig) => {
        expect(config.refillInterval).toBe(1000);
      });
    });

    it("should have positive maxTokens", () => {
      Object.values(RATE_LIMITS).forEach((config: RateLimitConfig) => {
        expect(config.maxTokens).toBeGreaterThan(0);
      });
    });

    it("should have positive refillRate", () => {
      Object.values(RATE_LIMITS).forEach((config: RateLimitConfig) => {
        expect(config.refillRate).toBeGreaterThan(0);
      });
    });
  });
});

describe("OTP_LIMITS", () => {
  it("should have request cooldown of 60 seconds", () => {
    expect(OTP_LIMITS.requestCooldownSeconds).toBe(60);
  });

  it("should have max 5 failed attempts", () => {
    expect(OTP_LIMITS.maxAttempts).toBe(5);
  });
});

describe("WINDOW_LIMITS", () => {
  it("should have login window of 1 hour in milliseconds", () => {
    expect(WINDOW_LIMITS.loginWindowMs).toBe(60 * 60 * 1000);
  });

  it("should have admin window of 1 minute in milliseconds", () => {
    expect(WINDOW_LIMITS.adminWindowMs).toBe(60 * 1000);
  });

  it("should have 10 max requests per admin window", () => {
    expect(WINDOW_LIMITS.adminMaxRequests).toBe(10);
  });
});
