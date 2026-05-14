/**
 * Unit tests for validation-utils
 *
 * Tests pure functions with no external dependencies:
 *   - validatePassword / validatePasswordMatch
 *   - validateEmail
 *   - validateClassCode / sanitizeClassCode
 *   - validatePIN / sanitizePIN
 *   - validateOTP / sanitizeOTP
 */

import {
  validatePassword,
  validatePasswordMatch,
  validateEmail,
  validateClassCode,
  sanitizeClassCode,
  validatePIN,
  sanitizePIN,
  validateOTP,
  sanitizeOTP,
} from "@/lib/validation-utils";

// ─────────────────────────────────────────────────────────────────────────────
// validatePassword
// ─────────────────────────────────────────────────────────────────────────────
describe("validatePassword", () => {
  it("rejects empty string", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects short password (<8 chars)", () => {
    const result = validatePassword("Ab1!");
    expect(result.valid).toBe(false);
  });

  it("accepts a strong password", () => {
    const result = validatePassword("Secure@Pass123");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a long passphrase", () => {
    const result = validatePassword("correct horse battery staple");
    expect(result.valid).toBe(true);
  });

  it("returns errors array (never undefined)", () => {
    const result = validatePassword("weak");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validatePasswordMatch
// ─────────────────────────────────────────────────────────────────────────────
describe("validatePasswordMatch", () => {
  it("returns valid when passwords match", () => {
    expect(validatePasswordMatch("abc123!", "abc123!").valid).toBe(true);
  });

  it("returns invalid when passwords differ", () => {
    const result = validatePasswordMatch("abc123!", "ABC123!");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Passwords do not match");
  });

  it("treats empty strings as matching", () => {
    // Two identical empty strings are technically equal
    expect(validatePasswordMatch("", "").valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateEmail
// ─────────────────────────────────────────────────────────────────────────────
describe("validateEmail", () => {
  it("accepts a valid gmail address", () => {
    const result = validateEmail("student@gmail.com");
    expect(result.valid).toBe(true);
  });

  it("rejects email with no @", () => {
    const result = validateEmail("notanemail");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects empty string", () => {
    expect(validateEmail("").valid).toBe(false);
  });

  it("rejects null-like input (non-string passed as any)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateEmail(null as any).valid).toBe(false);
  });

  it("is case-insensitive (trims + lowercases)", () => {
    const result = validateEmail("  STUDENT@GMAIL.COM  ");
    expect(result.valid).toBe(true);
  });

  it("rejects obviously invalid domain", () => {
    const result = validateEmail("user@notavaliddomain12345.xyz");
    expect(result.valid).toBe(false);
  });

  // PR-37: institutional email domains must be accepted
  // (Indian government / school addresses, the actual deployment audience).
  it("accepts Indian institutional gov.in addresses", () => {
    expect(validateEmail("principal@kvs.gov.in").valid).toBe(true);
    expect(validateEmail("admin@assam.gov.in").valid).toBe(true);
  });

  it("accepts Indian institutional edu.in addresses", () => {
    expect(validateEmail("teacher@scertassam.edu.in").valid).toBe(true);
  });

  it("accepts arbitrary org domains with a recognized TLD", () => {
    expect(validateEmail("foo@example.org").valid).toBe(true);
    expect(validateEmail("foo@my-school.net").valid).toBe(true);
  });

  it("rejects disposable email domains (kept for spam defence)", () => {
    expect(validateEmail("foo@10minutemail.com").valid).toBe(false);
  });

  it("suggests fix for common typos", () => {
    const result = validateEmail("foo@gmial.com");
    expect(result.valid).toBe(false);
    expect(result.suggestion).toBe("foo@gmail.com");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateClassCode
// ─────────────────────────────────────────────────────────────────────────────
describe("validateClassCode", () => {
  it("accepts a valid 6-char alphanumeric code", () => {
    expect(validateClassCode("A3F7E2").valid).toBe(true);
  });

  it("rejects codes shorter than 6 chars", () => {
    expect(validateClassCode("ABC").valid).toBe(false);
  });

  it("accepts codes longer than 6 chars (function truncates before validating)", () => {
    // validateClassCode internally truncates to 6 chars, so "ABCDEFGH" → "ABCDEF" → valid
    expect(validateClassCode("ABCDEFGH").valid).toBe(true);
  });

  it("rejects empty string", () => {
    expect(validateClassCode("").valid).toBe(false);
  });
});

describe("sanitizeClassCode", () => {
  it("uppercases and strips non-alphanumeric chars", () => {
    expect(sanitizeClassCode("a3-f7 e2!")).toBe("A3F7E2");
  });

  it("truncates to 6 characters", () => {
    expect(sanitizeClassCode("ABCDEFGH")).toHaveLength(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validatePIN / sanitizePIN
// ─────────────────────────────────────────────────────────────────────────────
describe("validatePIN", () => {
  it("accepts a valid 4-digit PIN", () => {
    expect(validatePIN("1234").valid).toBe(true);
  });

  it("rejects PIN shorter than 4 digits", () => {
    expect(validatePIN("12").valid).toBe(false);
  });

  it("rejects non-numeric PIN", () => {
    expect(validatePIN("12ab").valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePIN("").valid).toBe(false);
  });
});

describe("sanitizePIN", () => {
  it("strips non-numeric characters", () => {
    expect(sanitizePIN("12-ab34")).toBe("1234");
  });

  it("truncates to 4 digits", () => {
    expect(sanitizePIN("123456789")).toHaveLength(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateOTP / sanitizeOTP
// ─────────────────────────────────────────────────────────────────────────────
describe("validateOTP", () => {
  it("accepts a valid 6-digit OTP", () => {
    expect(validateOTP("123456").valid).toBe(true);
  });

  it("rejects OTP shorter than 6 digits", () => {
    expect(validateOTP("123").valid).toBe(false);
  });

  it("rejects non-numeric OTP", () => {
    expect(validateOTP("12345a").valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateOTP("").valid).toBe(false);
  });
});

describe("sanitizeOTP", () => {
  it("strips non-numeric chars", () => {
    expect(sanitizeOTP("12 34 56")).toBe("123456");
  });

  it("truncates to 6 digits", () => {
    expect(sanitizeOTP("1234567890")).toHaveLength(6);
  });
});
