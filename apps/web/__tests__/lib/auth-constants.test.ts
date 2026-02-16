/**
 * Tests for auth-constants module
 * Target: ~25 tests covering all authentication constants
 */

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  PIN_LENGTH,
  PIN_MAX_ATTEMPTS,
  PHONE_COUNTRY_CODE,
  PHONE_DIGIT_LENGTH,
  PHONE_TOTAL_LENGTH,
  EMAIL_MAX_LENGTH,
  EMAIL_REGEX,
  CLASS_CODE_LENGTH,
  VALID_EMAIL_PROVIDERS,
  COMMON_DOMAIN_TYPOS,
  BLOCKED_EMAIL_DOMAINS,
  AUTH_ERRORS,
  SUCCESS_MESSAGES,
} from "@/lib/auth-constants";

describe("auth-constants", () => {
  describe("Password validation constants", () => {
    it("should have minimum password length of 8", () => {
      expect(PASSWORD_MIN_LENGTH).toBe(8);
    });

    it("should have maximum password length of 128", () => {
      expect(PASSWORD_MAX_LENGTH).toBe(128);
    });

    it("should ensure min is less than max", () => {
      expect(PASSWORD_MIN_LENGTH).toBeLessThan(PASSWORD_MAX_LENGTH);
    });
  });

  describe("OTP validation constants", () => {
    it("should have OTP length of 6", () => {
      expect(OTP_LENGTH).toBe(6);
    });

    it("should have OTP expiry of 10 minutes", () => {
      expect(OTP_EXPIRY_MINUTES).toBe(10);
    });
  });

  describe("PIN validation constants", () => {
    it("should have PIN length of 4", () => {
      expect(PIN_LENGTH).toBe(4);
    });

    it("should have PIN max attempts of 3", () => {
      expect(PIN_MAX_ATTEMPTS).toBe(3);
    });
  });

  describe("Phone number validation constants", () => {
    it("should have India country code +91", () => {
      expect(PHONE_COUNTRY_CODE).toBe("+91");
    });

    it("should have phone digit length of 10", () => {
      expect(PHONE_DIGIT_LENGTH).toBe(10);
    });

    it("should calculate total length correctly", () => {
      expect(PHONE_TOTAL_LENGTH).toBe(
        PHONE_COUNTRY_CODE.length + PHONE_DIGIT_LENGTH
      );
    });
  });

  describe("Email validation constants", () => {
    it("should have max email length of 254", () => {
      expect(EMAIL_MAX_LENGTH).toBe(254);
    });

    it("should have valid email regex", () => {
      expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
    });

    it("should validate correct email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co",
        "user+tag@example.org",
        "test123@test.io",
      ];
      validEmails.forEach((email) => {
        expect(EMAIL_REGEX.test(email)).toBe(true);
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "invalid",
        "@domain.com",
        "test@",
        "test@.com",
        "test@domain",
      ];
      invalidEmails.forEach((email) => {
        expect(EMAIL_REGEX.test(email)).toBe(false);
      });
    });
  });

  describe("Class code validation", () => {
    it("should have class code length of 6", () => {
      expect(CLASS_CODE_LENGTH).toBe(6);
    });
  });

  describe("VALID_EMAIL_PROVIDERS", () => {
    it("should include common email providers", () => {
      expect(VALID_EMAIL_PROVIDERS).toContain("gmail.com");
      expect(VALID_EMAIL_PROVIDERS).toContain("yahoo.com");
      expect(VALID_EMAIL_PROVIDERS).toContain("outlook.com");
      expect(VALID_EMAIL_PROVIDERS).toContain("hotmail.com");
    });

    it("should include test domain", () => {
      expect(VALID_EMAIL_PROVIDERS).toContain("example.com");
    });

    it("should include India-specific providers", () => {
      expect(VALID_EMAIL_PROVIDERS).toContain("rediffmail.com");
    });

    it("should be an array", () => {
      expect(Array.isArray(VALID_EMAIL_PROVIDERS)).toBe(true);
    });
  });

  describe("COMMON_DOMAIN_TYPOS", () => {
    it("should map gmail typos correctly", () => {
      expect(COMMON_DOMAIN_TYPOS["gmai.com"]).toBe("gmail.com");
      expect(COMMON_DOMAIN_TYPOS["gmal.com"]).toBe("gmail.com");
      expect(COMMON_DOMAIN_TYPOS["gmial.com"]).toBe("gmail.com");
    });

    it("should map yahoo typos correctly", () => {
      expect(COMMON_DOMAIN_TYPOS["yahooo.com"]).toBe("yahoo.com");
      expect(COMMON_DOMAIN_TYPOS["yaho.com"]).toBe("yahoo.com");
    });

    it("should map outlook typos correctly", () => {
      expect(COMMON_DOMAIN_TYPOS["outlook.co"]).toBe("outlook.com");
      expect(COMMON_DOMAIN_TYPOS["outloik.com"]).toBe("outlook.com");
    });

    it("should map hotmail typos correctly", () => {
      expect(COMMON_DOMAIN_TYPOS["hotmial.com"]).toBe("hotmail.com");
      expect(COMMON_DOMAIN_TYPOS["hotmai.com"]).toBe("hotmail.com");
    });
  });

  describe("BLOCKED_EMAIL_DOMAINS", () => {
    it("should be a Set for O(1) lookup", () => {
      expect(BLOCKED_EMAIL_DOMAINS).toBeInstanceOf(Set);
    });

    it("should contain common disposable email domains", () => {
      expect(BLOCKED_EMAIL_DOMAINS.has("tempmail.com")).toBe(true);
      expect(BLOCKED_EMAIL_DOMAINS.has("mailinator.com")).toBe(true);
      expect(BLOCKED_EMAIL_DOMAINS.has("guerrillamail.com")).toBe(true);
      expect(BLOCKED_EMAIL_DOMAINS.has("10minutemail.com")).toBe(true);
    });

    it("should not contain legitimate email domains", () => {
      expect(BLOCKED_EMAIL_DOMAINS.has("gmail.com")).toBe(false);
      expect(BLOCKED_EMAIL_DOMAINS.has("yahoo.com")).toBe(false);
      expect(BLOCKED_EMAIL_DOMAINS.has("outlook.com")).toBe(false);
    });
  });

  describe("AUTH_ERRORS", () => {
    it("should have all required error messages", () => {
      expect(AUTH_ERRORS.INVALID_EMAIL).toBeDefined();
      expect(AUTH_ERRORS.EMAIL_ALREADY_EXISTS).toBeDefined();
      expect(AUTH_ERRORS.INVALID_PASSWORD).toBeDefined();
      expect(AUTH_ERRORS.PASSWORD_MISMATCH).toBeDefined();
      expect(AUTH_ERRORS.INVALID_OTP).toBeDefined();
      expect(AUTH_ERRORS.INVALID_PHONE).toBeDefined();
      expect(AUTH_ERRORS.INVALID_PIN).toBeDefined();
      expect(AUTH_ERRORS.INVALID_CLASS_CODE).toBeDefined();
      expect(AUTH_ERRORS.NETWORK_ERROR).toBeDefined();
      expect(AUTH_ERRORS.UNEXPECTED_ERROR).toBeDefined();
    });

    it("should include password length in error message", () => {
      expect(AUTH_ERRORS.INVALID_PASSWORD).toContain(
        String(PASSWORD_MIN_LENGTH)
      );
    });

    it("should have descriptive error messages", () => {
      expect(AUTH_ERRORS.INVALID_EMAIL.length).toBeGreaterThan(10);
      expect(AUTH_ERRORS.NETWORK_ERROR.length).toBeGreaterThan(10);
    });
  });

  describe("SUCCESS_MESSAGES", () => {
    it("should have all required success messages", () => {
      expect(SUCCESS_MESSAGES.OTP_SENT).toBeDefined();
      expect(SUCCESS_MESSAGES.EMAIL_VERIFIED).toBeDefined();
      expect(SUCCESS_MESSAGES.PHONE_VERIFIED).toBeDefined();
      expect(SUCCESS_MESSAGES.ACCOUNT_CREATED).toBeDefined();
      expect(SUCCESS_MESSAGES.SIGNED_IN).toBeDefined();
      expect(SUCCESS_MESSAGES.SIGNED_OUT).toBeDefined();
      expect(SUCCESS_MESSAGES.CLASS_JOINED).toBeDefined();
    });

    it("should include celebratory emojis for positive actions", () => {
      expect(SUCCESS_MESSAGES.ACCOUNT_CREATED).toContain("🎉");
      expect(SUCCESS_MESSAGES.SIGNED_IN).toContain("🎉");
      expect(SUCCESS_MESSAGES.CLASS_JOINED).toContain("🎉");
    });
  });
});
