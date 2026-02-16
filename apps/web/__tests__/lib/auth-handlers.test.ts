/**
 * Tests for auth-handlers.ts
 * Target: ~35 tests covering all auth handler functions
 */

// Mock dependencies before imports
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: jest.fn((email) => ({
    valid: email.includes("@") && email.includes("."),
    error: email.includes("@") ? "" : "Invalid email format",
  })),
  validatePhone: jest.fn((phone) => ({
    valid: phone.length >= 10,
    error: phone.length >= 10 ? "" : "Invalid phone number",
  })),
  validatePassword: jest.fn((password) => ({
    valid: password.length >= 8,
    errors: password.length >= 8 ? [] : ["Password must be at least 8 characters"],
  })),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkOtpRateLimit: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import {
  handleSignIn,
  handleSendOTP,
  handleVerifyOTP,
  handleSetPassword,
  handleAnonymousSignIn,
} from "@/lib/auth-handlers";
import { checkOtpRateLimit } from "@/lib/rate-limiter-distributed";
import { authLogger } from "@/lib/auth-logger";

describe("auth-handlers", () => {
  let mockSupabase: {
    auth: {
      signInWithPassword: jest.Mock;
      signInWithOtp: jest.Mock;
      verifyOtp: jest.Mock;
      updateUser: jest.Mock;
      signInAnonymously: jest.Mock;
    };
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (checkOtpRateLimit as jest.Mock).mockResolvedValue(true);

    mockSupabase = {
      auth: {
        signInWithPassword: jest.fn(),
        signInWithOtp: jest.fn(),
        verifyOtp: jest.fn(),
        updateUser: jest.fn(),
        signInAnonymously: jest.fn(),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn(),
          }),
        }),
      }),
    };
  });

  describe("handleSignIn", () => {
    describe("Email Sign In", () => {
      it("should sign in successfully with email", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        });

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "password123" }
        );

        expect(result.success).toBe(true);
        expect(result.user?.id).toBe("user-123");
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });

      it("should return error for invalid credentials", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: "Invalid login credentials" },
        });

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "wrongpassword" }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid login credentials");
      });

      it("should return error when no user returned", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "password123" }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Authentication failed - no user returned");
      });
    });

    describe("Phone Sign In", () => {
      it("should sign in successfully with phone", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "user-456", phone: "+1234567890" } },
          error: null,
        });

        const result = await handleSignIn(
          mockSupabase as any,
          { phone: "+1234567890", password: "password123" }
        );

        expect(result.success).toBe(true);
        expect(result.user?.id).toBe("user-456");
      });
    });

    describe("Validation", () => {
      it("should return error when neither email nor phone provided", async () => {
        const result = await handleSignIn(
          mockSupabase as any,
          { password: "password123" }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Email or phone is required");
      });

      it("should use custom validator if provided", async () => {
        const customValidator = jest.fn().mockReturnValue({ valid: false, error: "Custom error" });

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "password123" },
          { validatorFn: customValidator }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Custom error");
        expect(customValidator).toHaveBeenCalledWith("test@example.com");
      });
    });

    describe("Profile Check", () => {
      it("should check profile when required", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        });

        const mockMaybeSingle = jest.fn().mockResolvedValue({
          data: { id: "profile-123" },
          error: null,
        });

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        });

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "password123" },
          { requireProfileCheck: true, profileTable: "teacher_profiles" }
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith("teacher_profiles");
      });

      it("should return requiresProfileCheck when profile not found", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        });

        const mockMaybeSingle = jest.fn().mockResolvedValue({
          data: null,
          error: null,
        });

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        });

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "password123" },
          { requireProfileCheck: true, profileTable: "teacher_profiles" }
        );

        expect(result.success).toBe(true);
        expect(result.requiresProfileCheck).toBe(true);
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        mockSupabase.auth.signInWithPassword.mockRejectedValue(
          new Error("Network error")
        );

        const result = await handleSignIn(
          mockSupabase as any,
          { email: "test@example.com", password: "password123" }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
        expect(authLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe("handleSendOTP", () => {
    describe("Email OTP", () => {
      it("should send email OTP successfully", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

        const result = await handleSendOTP(
          mockSupabase as any,
          "test@example.com",
          "email"
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          options: { shouldCreateUser: true },
        });
      });

      it("should include redirect URL when provided", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

        await handleSendOTP(
          mockSupabase as any,
          "test@example.com",
          "email",
          { redirectUrl: "https://example.com/callback" }
        );

        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          options: {
            emailRedirectTo: "https://example.com/callback",
            shouldCreateUser: true,
          },
        });
      });

      it("should return error for invalid email", async () => {
        const result = await handleSendOTP(
          mockSupabase as any,
          "invalid-email",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid email");
      });
    });

    describe("Phone OTP", () => {
      it("should send phone OTP successfully", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

        const result = await handleSendOTP(
          mockSupabase as any,
          "+1234567890",
          "phone"
        );

        expect(result.success).toBe(true);
      });

      it("should return error for invalid phone", async () => {
        const result = await handleSendOTP(
          mockSupabase as any,
          "123",
          "phone"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid phone");
      });
    });

    describe("Rate Limiting", () => {
      it("should check rate limit", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

        await handleSendOTP(mockSupabase as any, "test@example.com", "email");

        expect(checkOtpRateLimit).toHaveBeenCalledWith("test@example.com");
      });

      it("should return error when rate limited", async () => {
        (checkOtpRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await handleSendOTP(
          mockSupabase as any,
          "test@example.com",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many OTP requests");
      });

      it("should skip rate limit check when option set", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });

        await handleSendOTP(
          mockSupabase as any,
          "test@example.com",
          "email",
          { skipRateLimit: true }
        );

        expect(checkOtpRateLimit).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      it("should handle Supabase errors", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({
          error: { message: "Email service unavailable" },
        });

        const result = await handleSendOTP(
          mockSupabase as any,
          "test@example.com",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Email service unavailable");
      });

      it("should handle unexpected errors", async () => {
        mockSupabase.auth.signInWithOtp.mockRejectedValue(
          new Error("Network error")
        );

        const result = await handleSendOTP(
          mockSupabase as any,
          "test@example.com",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });

  describe("handleVerifyOTP", () => {
    describe("Email Verification", () => {
      it("should verify email OTP successfully", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: { user: { id: "user-123" }, session: {} },
          error: null,
        });

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { email: "test@example.com" },
          "123456",
          "email"
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          token: "123456",
          type: "email",
        });
      });

      it("should return user when returnUser option is true", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" }, session: {} },
          error: null,
        });

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { email: "test@example.com" },
          "123456",
          "email",
          { returnUser: true }
        );

        expect(result.success).toBe(true);
        expect(result.user?.id).toBe("user-123");
      });
    });

    describe("Phone Verification", () => {
      it("should verify phone OTP successfully", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: { user: { id: "user-456" }, session: {} },
          error: null,
        });

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { phone: "+1234567890" },
          "123456",
          "sms"
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          phone: "+1234567890",
          token: "123456",
          type: "sms",
        });
      });
    });

    describe("Error Cases", () => {
      it("should return error when neither email nor phone provided", async () => {
        const result = await handleVerifyOTP(
          mockSupabase as any,
          {},
          "123456",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Email or phone is required");
      });

      it("should handle expired OTP error", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: null,
          error: { message: "OTP has expired" },
        });

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { email: "test@example.com" },
          "123456",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("expired");
      });

      it("should handle invalid OTP error", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: null,
          error: { message: "OTP is invalid" },
        });

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { email: "test@example.com" },
          "000000",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("didn't work");
      });

      it("should handle no user returned", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        });

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { email: "test@example.com" },
          "123456",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Verification failed - no user data");
      });

      it("should handle unexpected errors", async () => {
        mockSupabase.auth.verifyOtp.mockRejectedValue(new Error("Network error"));

        const result = await handleVerifyOTP(
          mockSupabase as any,
          { email: "test@example.com" },
          "123456",
          "email"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });

  describe("handleSetPassword", () => {
    it("should set password successfully", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

      const result = await handleSetPassword(
        mockSupabase as any,
        "newpassword123"
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });
    });

    it("should validate password by default", async () => {
      const result = await handleSetPassword(
        mockSupabase as any,
        "short"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("8 characters");
    });

    it("should skip validation when validate is false", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

      const result = await handleSetPassword(
        mockSupabase as any,
        "short",
        false
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalled();
    });

    it("should handle Supabase errors", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        error: { message: "Password update failed" },
      });

      const result = await handleSetPassword(
        mockSupabase as any,
        "newpassword123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Password update failed");
    });

    it("should handle unexpected errors", async () => {
      mockSupabase.auth.updateUser.mockRejectedValue(new Error("Network error"));

      const result = await handleSetPassword(
        mockSupabase as any,
        "newpassword123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });

  describe("handleAnonymousSignIn", () => {
    it("should sign in anonymously successfully", async () => {
      mockSupabase.auth.signInAnonymously.mockResolvedValue({ error: null });

      const result = await handleAnonymousSignIn(mockSupabase as any);

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalled();
    });

    it("should handle Supabase errors", async () => {
      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        error: { message: "Anonymous signin disabled" },
      });

      const result = await handleAnonymousSignIn(mockSupabase as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Anonymous signin disabled");
    });

    it("should handle unexpected errors", async () => {
      mockSupabase.auth.signInAnonymously.mockRejectedValue(
        new Error("Network error")
      );

      const result = await handleAnonymousSignIn(mockSupabase as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });
});
