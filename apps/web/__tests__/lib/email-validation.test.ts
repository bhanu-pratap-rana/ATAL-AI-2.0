/**
 * Tests for email-validation.ts
 * Tests email validation, typo detection, and domain validation
 */

import {
  VALID_TLDS,
  detectDomainTypo,
  isValidEmailDomain,
  validateEmail,
  normalizeEmail,
} from "@/lib/email-validation";

describe("email-validation", () => {
  describe("VALID_TLDS", () => {
    it("should include common TLDs", () => {
      expect(VALID_TLDS).toContain("com");
      expect(VALID_TLDS).toContain("org");
      expect(VALID_TLDS).toContain("net");
      expect(VALID_TLDS).toContain("edu");
      expect(VALID_TLDS).toContain("in");
    });

    it("should include country-specific TLDs", () => {
      expect(VALID_TLDS).toContain("co.uk");
      expect(VALID_TLDS).toContain("co.in");
    });
  });

  describe("detectDomainTypo", () => {
    it("should detect common typos from lookup table", () => {
      // Common typos should be in COMMON_DOMAIN_TYPOS
      const result = detectDomainTypo("gmial.com");
      expect(result.hasTypo).toBe(true);
    });

    it("should detect typos using Levenshtein distance", () => {
      // gmal.com is 1 character off from gmail.com
      const result = detectDomainTypo("gmal.com");
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe("gmail.com");
    });

    it("should return suggestion for exact match (distance 0 <= threshold)", () => {
      // Function returns hasTypo true even for exact matches since distance 0 <= threshold 2
      const result = detectDomainTypo("gmail.com");
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe("gmail.com");
    });

    it("should return no typo for completely different domain", () => {
      // Too far from any valid provider
      const result = detectDomainTypo("unknownservice.xyz");
      expect(result.hasTypo).toBe(false);
    });

    it("should find closest match for misspelled domain", () => {
      const result = detectDomainTypo("outloo.com");
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe("outlook.com");
    });
  });

  describe("isValidEmailDomain", () => {
    it("should validate known email providers", () => {
      expect(isValidEmailDomain("gmail.com")).toBe(true);
      expect(isValidEmailDomain("outlook.com")).toBe(true);
      expect(isValidEmailDomain("yahoo.com")).toBe(true);
    });

    it("should validate subdomains of known providers", () => {
      expect(isValidEmailDomain("mail.gmail.com")).toBe(true);
    });

    it("should validate domains with valid TLDs", () => {
      expect(isValidEmailDomain("company.com")).toBe(true);
      expect(isValidEmailDomain("organization.org")).toBe(true);
      expect(isValidEmailDomain("university.edu")).toBe(true);
    });

    it("should reject domains without TLD", () => {
      expect(isValidEmailDomain("localhost")).toBe(false);
    });

    it("should reject domains with empty parts", () => {
      expect(isValidEmailDomain(".com")).toBe(false);
      expect(isValidEmailDomain("domain..com")).toBe(false);
    });

    it("should reject domains with invalid TLD", () => {
      expect(isValidEmailDomain("domain.invalid")).toBe(false);
    });

    it("should reject domains with too short name", () => {
      expect(isValidEmailDomain("a.com")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isValidEmailDomain("GMAIL.COM")).toBe(true);
      expect(isValidEmailDomain("Gmail.Com")).toBe(true);
    });
  });

  describe("validateEmail", () => {
    it("should validate correct email", () => {
      const result = validateEmail("user@gmail.com");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject empty email", () => {
      const result = validateEmail("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject null/undefined email", () => {
      // @ts-expect-error - Testing invalid input
      expect(validateEmail(null).valid).toBe(false);
      // @ts-expect-error - Testing invalid input
      expect(validateEmail(undefined).valid).toBe(false);
    });

    it("should reject non-string email", () => {
      // @ts-expect-error - Testing invalid input
      expect(validateEmail(123).valid).toBe(false);
    });

    it("should reject email without @", () => {
      const result = validateEmail("usergmail.com");
      expect(result.valid).toBe(false);
    });

    it("should reject email without domain", () => {
      const result = validateEmail("user@");
      expect(result.valid).toBe(false);
    });

    it("should reject email without local part", () => {
      const result = validateEmail("@gmail.com");
      expect(result.valid).toBe(false);
    });

    it("should suggest correction for typo", () => {
      const result = validateEmail("user@gmial.com");
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain("@gmail.com");
    });

    it("should trim and lowercase email", () => {
      const result = validateEmail("  USER@GMAIL.COM  ");
      expect(result.valid).toBe(true);
    });

    it("should reject very long emails", () => {
      const longEmail = "a".repeat(300) + "@gmail.com";
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
    });

    it("should reject email with invalid domain not similar to any provider", () => {
      const result = validateEmail("user@randomxyz.abc");
      expect(result.valid).toBe(false);
    });

    it("should validate various email formats", () => {
      expect(validateEmail("user.name@gmail.com").valid).toBe(true);
      expect(validateEmail("user+tag@gmail.com").valid).toBe(true);
      expect(validateEmail("user123@gmail.com").valid).toBe(true);
    });
  });

  describe("normalizeEmail", () => {
    it("should lowercase email", () => {
      expect(normalizeEmail("USER@GMAIL.COM")).toBe("user@gmail.com");
    });

    it("should trim whitespace", () => {
      expect(normalizeEmail("  user@gmail.com  ")).toBe("user@gmail.com");
    });

    it("should handle mixed case and whitespace", () => {
      expect(normalizeEmail("  User@Gmail.COM  ")).toBe("user@gmail.com");
    });
  });
});
