/**
 * Tests for teacher-onboard.ts server actions
 * Target: ~30 tests covering sendEmailOtp, verifyEmailOtp, setPassword, saveTeacherProfile, updateTeacherProfile, getTeacherProfile
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
  getCurrentUser: jest.fn(),
}));

jest.mock("@/app/actions/auth", () => ({
  checkEmailExistsInAuth: jest.fn(() => ({ exists: false })),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkOtpRateLimit: jest.fn(() => true),
  checkTeacherOnboardRateLimit: jest.fn(() => true),
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
  sendEmailOtp,
  verifyEmailOtp,
  setPassword,
  saveTeacherProfile,
  updateTeacherProfile,
  getTeacherProfile,
} from "@/app/actions/teacher-onboard";
import {
  createClient,
  createAdminClient,
  getCurrentUser,
} from "@/lib/supabase-server";
import { checkEmailExistsInAuth } from "@/app/actions/auth";
import {
  checkOtpRateLimit,
  checkTeacherOnboardRateLimit,
} from "@/lib/rate-limiter-distributed";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    auth: {
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
      updateUser: jest.fn().mockResolvedValue({ error: null }),
      admin: {
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
      },
    },
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("teacher-onboard", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: validUUID, email: "teacher@test.com" });
    (checkOtpRateLimit as jest.Mock).mockResolvedValue(true);
    (checkTeacherOnboardRateLimit as jest.Mock).mockResolvedValue(true);
    (checkEmailExistsInAuth as jest.Mock).mockResolvedValue({ exists: false });
  });

  describe("sendEmailOtp", () => {
    describe("Rate Limiting", () => {
      it("should reject when OTP rate limit exceeded", async () => {
        (checkOtpRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await sendEmailOtp("test@example.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many OTP requests");
      });
    });

    describe("Email Existence Check", () => {
      it("should return exists flag when email already registered", async () => {
        (checkEmailExistsInAuth as jest.Mock).mockResolvedValue({
          exists: true,
          role: "teacher",
        });

        const result = await sendEmailOtp("existing@test.com");

        expect(result.success).toBe(false);
        expect(result.exists).toBe(true);
        expect(result.error).toContain("already registered");
      });

      it("should proceed for new email", async () => {
        const result = await sendEmailOtp("new@test.com");

        expect(result.success).toBe(true);
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalled();
      });
    });

    describe("OTP Sending", () => {
      it("should send OTP with correct email (trimmed and lowercased)", async () => {
        await sendEmailOtp("  Test@EXAMPLE.com  ");

        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          options: { shouldCreateUser: true },
        });
      });

      it("should handle Supabase error", async () => {
        mockSupabase.auth.signInWithOtp.mockResolvedValue({
          error: { message: "Email rate limit exceeded" },
        });

        const result = await sendEmailOtp("test@example.com");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Email rate limit exceeded");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

        const result = await sendEmailOtp("test@example.com");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to send OTP. Please try again.");
      });
    });
  });

  describe("verifyEmailOtp", () => {
    describe("Successful Verification", () => {
      it("should verify OTP and return userId", async () => {
        const result = await verifyEmailOtp({
          email: "test@example.com",
          token: "123456",
        });

        expect(result.success).toBe(true);
        expect(result.userId).toBe("user-123");
      });

      it("should trim and lowercase email", async () => {
        await verifyEmailOtp({
          email: "  TEST@Example.com  ",
          token: "  123456  ",
        });

        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          token: "123456",
          type: "email",
        });
      });
    });

    describe("Error Handling", () => {
      it("should handle expired token", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: {},
          error: { status: 406, message: "Token has expired" },
        });

        const result = await verifyEmailOtp({
          email: "test@example.com",
          token: "123456",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("expired");
      });

      it("should handle rate limit error", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: {},
          error: { status: 429, message: "Rate limit exceeded" },
        });

        const result = await verifyEmailOtp({
          email: "test@example.com",
          token: "123456",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many attempts");
      });

      it("should handle no user returned", async () => {
        mockSupabase.auth.verifyOtp.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await verifyEmailOtp({
          email: "test@example.com",
          token: "123456",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Verification failed. Please try again.");
      });

      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Network error"));

        const result = await verifyEmailOtp({
          email: "test@example.com",
          token: "123456",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to verify OTP. Please try again.");
      });
    });
  });

  describe("setPassword", () => {
    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await setPassword("password123");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Not authenticated");
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkTeacherOnboardRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await setPassword("password123");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });
    });

    describe("Validation", () => {
      it("should reject short password", async () => {
        const result = await setPassword("short");

        expect(result.success).toBe(false);
        expect(result.error).toContain("at least 8 characters");
      });

      it("should reject empty password", async () => {
        const result = await setPassword("");

        expect(result.success).toBe(false);
        expect(result.error).toContain("at least 8 characters");
      });
    });

    describe("Password Update", () => {
      it("should update password successfully", async () => {
        const result = await setPassword("validpassword123");

        expect(result.success).toBe(true);
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          password: "validpassword123",
        });
      });

      it("should handle update error", async () => {
        mockSupabase.auth.updateUser.mockResolvedValue({
          error: { message: "Password too weak" },
        });

        const result = await setPassword("password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Password too weak");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection error"));

        const result = await setPassword("password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to set password. Please try again.");
      });
    });
  });

  describe("saveTeacherProfile", () => {
    const validProfile = {
      name: "John Doe",
      gender: "male" as const,
      phone: "1234567890",
      schoolId: validUUID,
      schoolCode: "SCH001",
    };

    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkTeacherOnboardRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });
    });

    describe("Profile Existence Check", () => {
      it("should reject if profile already exists", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { user_id: validUUID },
          error: null,
        });

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toContain("already exists");
      });

      it("should handle profile check error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to verify profile status");
      });
    });

    describe("Profile Creation", () => {
      it("should create profile successfully", async () => {
        mockSupabase._mockQueryBuilder.insert.mockReturnValue({
          error: null,
        });
        const mockAdminClient = {
          auth: {
            admin: {
              updateUserById: jest.fn().mockResolvedValue({ error: null }),
            },
          },
        };
        (createAdminClient as jest.Mock).mockResolvedValue(mockAdminClient);

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith("teacher_profiles");
      });

      it("should handle insert error", async () => {
        mockSupabase._mockQueryBuilder.insert.mockReturnValue({
          error: { message: "Insert failed" },
        });

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to create teacher profile");
      });

      it("should continue even if admin metadata update fails", async () => {
        mockSupabase._mockQueryBuilder.insert.mockReturnValue({
          error: null,
        });
        const mockAdminClient = {
          auth: {
            admin: {
              updateUserById: jest.fn().mockResolvedValue({ error: { message: "Admin error" } }),
            },
          },
        };
        (createAdminClient as jest.Mock).mockResolvedValue(mockAdminClient);

        const result = await saveTeacherProfile(validProfile);

        expect(result.success).toBe(true);
      });
    });
  });

  describe("updateTeacherProfile", () => {
    const validUpdate = {
      name: "Jane Doe",
      gender: "female" as const,
      phone: "9876543210",
    };

    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await updateTeacherProfile(validUpdate);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });
    });

    describe("Validation", () => {
      it("should reject empty name", async () => {
        const result = await updateTeacherProfile({
          ...validUpdate,
          name: "",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Name is required");
      });

      it("should reject missing gender", async () => {
        const result = await updateTeacherProfile({
          ...validUpdate,
          gender: "" as "male" | "female",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Gender is required");
      });
    });

    describe("Profile Update", () => {
      it("should update profile successfully", async () => {
        mockSupabase._mockQueryBuilder.eq.mockReturnValue({
          error: null,
        });

        const result = await updateTeacherProfile(validUpdate);

        expect(result.success).toBe(true);
      });

      it("should handle update error", async () => {
        mockSupabase._mockQueryBuilder.eq.mockReturnValue({
          error: { message: "Update failed" },
        });

        const result = await updateTeacherProfile(validUpdate);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to update profile");
      });
    });
  });

  describe("getTeacherProfile", () => {
    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await getTeacherProfile();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
        expect(result.profile).toBeNull();
      });
    });

    describe("Profile Retrieval", () => {
      it("should return profile when found", async () => {
        const mockProfile = {
          user_id: validUUID,
          name: "Teacher Name",
          phone: "1234567890",
        };
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: mockProfile,
          error: null,
        });

        const result = await getTeacherProfile();

        expect(result.success).toBe(true);
        expect(result.profile).toEqual(mockProfile);
      });

      it("should return null profile when not found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await getTeacherProfile();

        expect(result.success).toBe(true);
        expect(result.profile).toBeNull();
      });

      it("should handle fetch error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await getTeacherProfile();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch profile");
        expect(result.profile).toBeNull();
      });
    });
  });
});
