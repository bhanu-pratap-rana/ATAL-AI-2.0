/**
 * Tests for password-utils.ts
 * Tests NIST 2025 compliant password utilities
 */

// Mock global fetch for breach checking
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  NIST_2025_PASSWORD_RULES,
  NIST_2025_MIN_PASSWORD_LENGTH,
  isPasswordBreached,
  getPasswordValidationError,
  validatePasswordNist2025,
  estimatePasswordStrengthNist2025,
  getPasswordStrengthLabelNist2025,
} from "@/lib/password-utils";
import { authLogger } from "@/lib/auth-logger";

describe("password-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("NIST_2025_PASSWORD_RULES", () => {
    it("should have correct minimum length", () => {
      expect(NIST_2025_PASSWORD_RULES.minLength).toBe(8);
    });

    it("should have correct maximum length", () => {
      expect(NIST_2025_PASSWORD_RULES.maxLength).toBe(64);
    });

    it("should not require uppercase", () => {
      expect(NIST_2025_PASSWORD_RULES.requireUppercase).toBe(false);
    });

    it("should not require lowercase", () => {
      expect(NIST_2025_PASSWORD_RULES.requireLowercase).toBe(false);
    });

    it("should not require numbers", () => {
      expect(NIST_2025_PASSWORD_RULES.requireNumbers).toBe(false);
    });

    it("should not require special characters", () => {
      expect(NIST_2025_PASSWORD_RULES.requireSpecialChars).toBe(false);
    });
  });

  describe("NIST_2025_MIN_PASSWORD_LENGTH", () => {
    it("should equal minLength from rules", () => {
      expect(NIST_2025_MIN_PASSWORD_LENGTH).toBe(NIST_2025_PASSWORD_RULES.minLength);
    });
  });

  describe("isPasswordBreached", () => {
    it("should return false for non-breached password", async () => {
      // Mock API response with hashes that don't match
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("ABCDEF123456789:100\r\n0000000000000:50"),
      });

      const result = await isPasswordBreached("unique-secure-password-12345");

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return true for breached password", async () => {
      // "password" hashes to 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n0000000000000:50"
        ),
      });

      const result = await isPasswordBreached("password");

      expect(result).toBe(true);
      expect(authLogger.info).toHaveBeenCalledWith(
        "[isPasswordBreached] Password found in breach database"
      );
    });

    it("should return false on API error (non-200 status)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await isPasswordBreached("test-password");

      expect(result).toBe(false);
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[isPasswordBreached] API returned non-200 status",
        expect.any(Object)
      );
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await isPasswordBreached("test-password");

      expect(result).toBe(false);
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[isPasswordBreached] Exception checking password breach",
        expect.any(Object)
      );
    });

    it("should return false on timeout", async () => {
      mockFetch.mockRejectedValue(new Error("AbortError: The operation was aborted"));

      const result = await isPasswordBreached("test-password");

      expect(result).toBe(false);
    });

    it("should send correct User-Agent header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("ABC:100"),
      });

      await isPasswordBreached("test-password");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "Atal-AI-Educational-Platform/1.0",
          }),
        })
      );
    });
  });

  describe("getPasswordValidationError", () => {
    it("should return error for password too short", () => {
      const error = getPasswordValidationError("short");

      expect(error).toBe("Password must be at least 8 characters");
    });

    it("should return error for empty password", () => {
      const error = getPasswordValidationError("");

      expect(error).toBe("Password must be at least 8 characters");
    });

    it("should return error for password too long", () => {
      const longPassword = "a".repeat(65);
      const error = getPasswordValidationError(longPassword);

      expect(error).toBe("Password is too long (maximum 64 characters)");
    });

    it("should return null for valid password", () => {
      const error = getPasswordValidationError("validpassword");

      expect(error).toBeNull();
    });

    it("should return null for minimum length password", () => {
      const error = getPasswordValidationError("12345678");

      expect(error).toBeNull();
    });

    it("should return null for maximum length password", () => {
      const maxPassword = "a".repeat(64);
      const error = getPasswordValidationError(maxPassword);

      expect(error).toBeNull();
    });
  });

  describe("validatePasswordNist2025", () => {
    it("should return valid for good password without breach check", async () => {
      const result = await validatePasswordNist2025("goodpassword123");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for short password", async () => {
      const result = await validatePasswordNist2025("short");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Password must be at least 8 characters");
    });

    it("should return invalid for too long password", async () => {
      const result = await validatePasswordNist2025("a".repeat(65));

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Password is too long (maximum 64 characters)");
    });

    it("should check breach when requested and return valid if not breached", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue("ABCDEF:100"),
      });

      const result = await validatePasswordNist2025("goodpassword123", true);

      expect(result.valid).toBe(true);
      expect(result.isBreached).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return invalid if password is breached", async () => {
      // "password" hashes to 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(
          "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493"
        ),
      });

      const result = await validatePasswordNist2025("password", true);

      expect(result.valid).toBe(false);
      expect(result.isBreached).toBe(true);
      expect(result.error).toContain("data breach");
    });

    it("should return valid with isBreached false on breach check error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await validatePasswordNist2025("goodpassword123", true);

      // isPasswordBreached catches errors internally and returns false
      // so validatePasswordNist2025 sees false (not breached) and returns valid
      expect(result.valid).toBe(true);
      expect(result.isBreached).toBe(false);
      // The warning is logged by isPasswordBreached, not validatePasswordNist2025
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[isPasswordBreached] Exception checking password breach",
        expect.any(Object)
      );
    });

    it("should not check breach by default", async () => {
      const result = await validatePasswordNist2025("goodpassword123");

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.isBreached).toBeUndefined();
    });
  });

  describe("estimatePasswordStrengthNist2025", () => {
    it("should return low score for short password", () => {
      const score = estimatePasswordStrengthNist2025("short");

      expect(score).toBeLessThan(30);
    });

    it("should return higher score for 12+ character password", () => {
      const score = estimatePasswordStrengthNist2025("twelvechars!");

      expect(score).toBeGreaterThanOrEqual(30);
    });

    it("should increase score for 16+ characters", () => {
      const score12 = estimatePasswordStrengthNist2025("a".repeat(12));
      const score16 = estimatePasswordStrengthNist2025("a".repeat(16));

      expect(score16).toBeGreaterThan(score12);
    });

    it("should increase score for 20+ characters", () => {
      const score16 = estimatePasswordStrengthNist2025("a".repeat(16));
      const score20 = estimatePasswordStrengthNist2025("a".repeat(20));

      expect(score20).toBeGreaterThan(score16);
    });

    it("should increase score for 30+ characters", () => {
      const score20 = estimatePasswordStrengthNist2025("a".repeat(20));
      const score30 = estimatePasswordStrengthNist2025("a".repeat(30));

      expect(score30).toBeGreaterThan(score20);
    });

    it("should add points for character diversity", () => {
      const lowerOnly = estimatePasswordStrengthNist2025("abcdefghijkl");
      const mixed = estimatePasswordStrengthNist2025("Abc123!@#xyz");

      expect(mixed).toBeGreaterThan(lowerOnly);
    });

    it("should cap score at 100", () => {
      // Very long password with all character types
      const score = estimatePasswordStrengthNist2025(
        "Abcdefghij1234567890!@#$%^&*()AbcdefAbcdef"
      );

      expect(score).toBeLessThanOrEqual(100);
    });

    it("should give max diversity bonus for all character types", () => {
      const allTypes = estimatePasswordStrengthNist2025("Aa1!aaaaaaaa");
      const oneType = estimatePasswordStrengthNist2025("aaaaaaaaaaaa");

      // 4 types * 5 points = 20 additional points
      expect(allTypes - oneType).toBe(15); // 3 additional types * 5 = 15
    });
  });

  describe("getPasswordStrengthLabelNist2025", () => {
    it("should return 'Weak' for score < 30", () => {
      expect(getPasswordStrengthLabelNist2025(0)).toBe("Weak");
      expect(getPasswordStrengthLabelNist2025(15)).toBe("Weak");
      expect(getPasswordStrengthLabelNist2025(29)).toBe("Weak");
    });

    it("should return 'Fair' for score 30-49", () => {
      expect(getPasswordStrengthLabelNist2025(30)).toBe("Fair");
      expect(getPasswordStrengthLabelNist2025(40)).toBe("Fair");
      expect(getPasswordStrengthLabelNist2025(49)).toBe("Fair");
    });

    it("should return 'Good' for score 50-69", () => {
      expect(getPasswordStrengthLabelNist2025(50)).toBe("Good");
      expect(getPasswordStrengthLabelNist2025(60)).toBe("Good");
      expect(getPasswordStrengthLabelNist2025(69)).toBe("Good");
    });

    it("should return 'Strong' for score 70-84", () => {
      expect(getPasswordStrengthLabelNist2025(70)).toBe("Strong");
      expect(getPasswordStrengthLabelNist2025(77)).toBe("Strong");
      expect(getPasswordStrengthLabelNist2025(84)).toBe("Strong");
    });

    it("should return 'Very Strong' for score >= 85", () => {
      expect(getPasswordStrengthLabelNist2025(85)).toBe("Very Strong");
      expect(getPasswordStrengthLabelNist2025(90)).toBe("Very Strong");
      expect(getPasswordStrengthLabelNist2025(100)).toBe("Very Strong");
    });
  });
});
