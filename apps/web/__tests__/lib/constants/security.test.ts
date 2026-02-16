/**
 * Tests for security constants
 * Target: ~25 tests covering security and cryptography constants
 */

import {
  BCRYPT_ROUNDS,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_DURATION_MS,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  SESSION_TIMEOUT_MS,
  SESSION_RENEWAL_THRESHOLD_MS,
  DEFAULT_DEV_ORIGIN,
  REQUEST_TIMEOUT_MS,
} from "@/lib/constants/security";

describe("BCRYPT_ROUNDS", () => {
  it("should be 10 rounds", () => {
    expect(BCRYPT_ROUNDS).toBe(10);
  });

  it("should be a positive integer", () => {
    expect(BCRYPT_ROUNDS).toBeGreaterThan(0);
    expect(Number.isInteger(BCRYPT_ROUNDS)).toBe(true);
  });

  it("should be within reasonable range (8-14 for production)", () => {
    expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(8);
    expect(BCRYPT_ROUNDS).toBeLessThanOrEqual(14);
  });
});

describe("MAX_PIN_ATTEMPTS", () => {
  it("should be 5 attempts", () => {
    expect(MAX_PIN_ATTEMPTS).toBe(5);
  });

  it("should be a positive integer", () => {
    expect(MAX_PIN_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_PIN_ATTEMPTS)).toBe(true);
  });

  it("should be reasonable for security (3-10 range)", () => {
    expect(MAX_PIN_ATTEMPTS).toBeGreaterThanOrEqual(3);
    expect(MAX_PIN_ATTEMPTS).toBeLessThanOrEqual(10);
  });
});

describe("PIN_LOCKOUT_DURATION_MS", () => {
  it("should be 15 minutes in milliseconds", () => {
    expect(PIN_LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it("should equal 900000ms", () => {
    expect(PIN_LOCKOUT_DURATION_MS).toBe(900000);
  });

  it("should be positive", () => {
    expect(PIN_LOCKOUT_DURATION_MS).toBeGreaterThan(0);
  });

  it("should be between 5 minutes and 1 hour", () => {
    const fiveMinutes = 5 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    expect(PIN_LOCKOUT_DURATION_MS).toBeGreaterThanOrEqual(fiveMinutes);
    expect(PIN_LOCKOUT_DURATION_MS).toBeLessThanOrEqual(oneHour);
  });
});

describe("MAX_LOGIN_ATTEMPTS", () => {
  it("should be 10 attempts", () => {
    expect(MAX_LOGIN_ATTEMPTS).toBe(10);
  });

  it("should be a positive integer", () => {
    expect(MAX_LOGIN_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_LOGIN_ATTEMPTS)).toBe(true);
  });

  it("should be more lenient than PIN attempts", () => {
    expect(MAX_LOGIN_ATTEMPTS).toBeGreaterThanOrEqual(MAX_PIN_ATTEMPTS);
  });
});

describe("LOGIN_RATE_LIMIT_WINDOW_MS", () => {
  it("should be 1 hour in milliseconds", () => {
    expect(LOGIN_RATE_LIMIT_WINDOW_MS).toBe(60 * 60 * 1000);
  });

  it("should equal 3600000ms", () => {
    expect(LOGIN_RATE_LIMIT_WINDOW_MS).toBe(3600000);
  });

  it("should be positive", () => {
    expect(LOGIN_RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
  });

  it("should be longer than PIN lockout duration", () => {
    expect(LOGIN_RATE_LIMIT_WINDOW_MS).toBeGreaterThanOrEqual(
      PIN_LOCKOUT_DURATION_MS
    );
  });
});

describe("SESSION_TIMEOUT_MS", () => {
  it("should be 24 hours in milliseconds", () => {
    expect(SESSION_TIMEOUT_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("should equal 86400000ms", () => {
    expect(SESSION_TIMEOUT_MS).toBe(86400000);
  });

  it("should be positive", () => {
    expect(SESSION_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("should be at least 1 hour", () => {
    const oneHour = 60 * 60 * 1000;
    expect(SESSION_TIMEOUT_MS).toBeGreaterThanOrEqual(oneHour);
  });
});

describe("SESSION_RENEWAL_THRESHOLD_MS", () => {
  it("should be 24 hours in milliseconds", () => {
    expect(SESSION_RENEWAL_THRESHOLD_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("should equal session timeout", () => {
    expect(SESSION_RENEWAL_THRESHOLD_MS).toBe(SESSION_TIMEOUT_MS);
  });

  it("should be positive", () => {
    expect(SESSION_RENEWAL_THRESHOLD_MS).toBeGreaterThan(0);
  });
});

describe("DEFAULT_DEV_ORIGIN", () => {
  it("should be localhost:3000", () => {
    expect(DEFAULT_DEV_ORIGIN).toBe("http://localhost:3000");
  });

  it("should be a valid URL", () => {
    expect(() => new URL(DEFAULT_DEV_ORIGIN)).not.toThrow();
  });

  it("should use http protocol", () => {
    const url = new URL(DEFAULT_DEV_ORIGIN);
    expect(url.protocol).toBe("http:");
  });

  it("should use localhost hostname", () => {
    const url = new URL(DEFAULT_DEV_ORIGIN);
    expect(url.hostname).toBe("localhost");
  });

  it("should use port 3000", () => {
    const url = new URL(DEFAULT_DEV_ORIGIN);
    expect(url.port).toBe("3000");
  });
});

describe("REQUEST_TIMEOUT_MS", () => {
  it("should be 30 seconds in milliseconds", () => {
    expect(REQUEST_TIMEOUT_MS).toBe(30000);
  });

  it("should be positive", () => {
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("should be reasonable for API requests (5-60 seconds)", () => {
    const fiveSeconds = 5000;
    const sixtySeconds = 60000;
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(fiveSeconds);
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(sixtySeconds);
  });
});

describe("Security constants relationships", () => {
  it("should have PIN lockout shorter than login rate limit window", () => {
    expect(PIN_LOCKOUT_DURATION_MS).toBeLessThan(LOGIN_RATE_LIMIT_WINDOW_MS);
  });

  it("should have all time-based values be positive", () => {
    expect(PIN_LOCKOUT_DURATION_MS).toBeGreaterThan(0);
    expect(LOGIN_RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    expect(SESSION_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SESSION_RENEWAL_THRESHOLD_MS).toBeGreaterThan(0);
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("should have all attempt-based values be positive integers", () => {
    expect(MAX_PIN_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_PIN_ATTEMPTS)).toBe(true);
    expect(MAX_LOGIN_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_LOGIN_ATTEMPTS)).toBe(true);
  });
});
