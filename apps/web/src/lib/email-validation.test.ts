import { describe, it, expect } from "vitest";
import { validateEmail } from "./email-validation";

describe("validateEmail", () => {
  it("accepts standard commercial domains", () => {
    expect(validateEmail("teacher@gmail.com").valid).toBe(true);
    expect(validateEmail("user@outlook.com").valid).toBe(true);
  });

  it("accepts Indian institutional domains (the bug fix)", () => {
    expect(validateEmail("principal@kvs.gov.in").valid).toBe(true);
    expect(validateEmail("teacher@scertassam.edu.in").valid).toBe(true);
    expect(validateEmail("admin@assam.gov.in").valid).toBe(true);
  });

  it("accepts arbitrary org domains with valid TLD", () => {
    expect(validateEmail("foo@bar.com").valid).toBe(true);
    expect(validateEmail("foo@example.org").valid).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("").valid).toBe(false);
    expect(validateEmail("notanemail").valid).toBe(false);
    expect(validateEmail("@nodomain.com").valid).toBe(false);
    expect(validateEmail("nolocal@").valid).toBe(false);
  });

  it("rejects disposable domains", () => {
    expect(validateEmail("foo@10minutemail.com").valid).toBe(false);
  });

  it("rejects unknown TLDs", () => {
    expect(validateEmail("foo@bar.invalidtld").valid).toBe(false);
  });

  it("suggests fix for common typos", () => {
    const result = validateEmail("foo@gmial.com");
    expect(result.valid).toBe(false);
    expect(result.suggestion).toBe("foo@gmail.com");
  });
});
