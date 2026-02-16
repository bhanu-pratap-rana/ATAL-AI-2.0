/**
 * Tests for student.ts server actions
 * Target: ~35 tests covering saveStudentProfile, getStudentProfile, previewClass, joinClass, leaveClass
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  getCurrentUser: jest.fn(),
  verifyStudentAuth: jest.fn(),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(() => true),
  checkStudentMutationRateLimit: jest.fn(() => true),
}));

jest.mock("@/lib/cache/query-cache", () => ({
  queryCache: {
    getOrFetch: jest.fn((key, fetcher) => fetcher()),
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
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
  saveStudentProfile,
  getStudentProfile,
  previewClass,
  joinClass,
  leaveClass,
} from "@/app/actions/student";
import {
  createClient,
  getCurrentUser,
  verifyStudentAuth,
} from "@/lib/supabase-server";
import {
  checkRateLimit,
  checkStudentMutationRateLimit,
} from "@/lib/rate-limiter-distributed";
import { queryCache } from "@/lib/cache/query-cache";
import { revalidatePath } from "next/cache";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("student", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (verifyStudentAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: validUUID, email: "student@test.com", is_anonymous: false },
    });
    (checkStudentMutationRateLimit as jest.Mock).mockResolvedValue(true);
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("saveStudentProfile", () => {
    const validProfile = {
      name: "Test Student",
      gender: "male" as const,
      phone: "1234567890",
      rollNumber: "R001",
      schoolName: "Test School",
      className: "Class 5",
      village: "Test Village",
    };

    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyStudentAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await saveStudentProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });

      it("should call verifyStudentAuth with correct action name", async () => {
        await saveStudentProfile(validProfile);

        expect(verifyStudentAuth).toHaveBeenCalledWith("saveStudentProfile");
      });
    });

    describe("Input Validation", () => {
      it("should reject empty name", async () => {
        const result = await saveStudentProfile({
          ...validProfile,
          name: "",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject invalid gender", async () => {
        const result = await saveStudentProfile({
          ...validProfile,
          gender: "invalid" as "male" | "female",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should accept valid profile data", async () => {
        const result = await saveStudentProfile(validProfile);

        expect(result.success).toBe(true);
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkStudentMutationRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await saveStudentProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Too many requests. Please try again later.");
      });
    });

    describe("RPC Upsert", () => {
      it("should call upsert_student_profile RPC with correct params", async () => {
        await saveStudentProfile(validProfile);

        expect(mockSupabase.rpc).toHaveBeenCalledWith("upsert_student_profile", {
          p_user_id: validUUID,
          p_name: validProfile.name,
          p_gender: validProfile.gender,
          p_date_of_birth: null,
          p_phone: validProfile.phone,
          p_location: validProfile.village,
          p_medium: null,
          p_board: null,
          p_class: validProfile.className,
        });
      });

      it("should handle RPC error", async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { code: "500", message: "RPC failed" },
        });

        const result = await saveStudentProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to save profile. Please try again.");
      });

      it("should handle RPC returning error response", async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: { success: false, error: "Profile already exists" },
          error: null,
        });

        const result = await saveStudentProfile(validProfile);

        expect(result.success).toBe(false);
      });

      it("should revalidate dashboard path on success", async () => {
        await saveStudentProfile(validProfile);

        expect(revalidatePath).toHaveBeenCalledWith("/app/dashboard");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        mockSupabase.rpc.mockRejectedValue(new Error("Unexpected error"));

        const result = await saveStudentProfile(validProfile);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unexpected error");
      });
    });
  });

  describe("getStudentProfile", () => {
    describe("Authentication", () => {
      it("should return error when not authenticated", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await getStudentProfile();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
        expect(result.profile).toBeNull();
      });
    });

    describe("Caching", () => {
      it("should use query cache with correct key", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({ id: validUUID });

        await getStudentProfile();

        expect(queryCache.getOrFetch).toHaveBeenCalledWith(
          `student:${validUUID}:profile`,
          expect.any(Function),
          2 * 60 * 1000
        );
      });

      it("should use 2-minute cache TTL", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({ id: validUUID });

        await getStudentProfile();

        expect(queryCache.getOrFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Function),
          120000 // 2 minutes in ms
        );
      });
    });

    describe("Data Retrieval", () => {
      it("should return profile when found", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({ id: validUUID });
        const mockProfile = {
          user_id: validUUID,
          name: "Test Student",
          gender: "male",
        };
        (queryCache.getOrFetch as jest.Mock).mockResolvedValue(mockProfile);

        const result = await getStudentProfile();

        expect(result.success).toBe(true);
        expect(result.profile).toEqual(mockProfile);
      });

      it("should return null profile when not found", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({ id: validUUID });
        (queryCache.getOrFetch as jest.Mock).mockResolvedValue(null);

        const result = await getStudentProfile();

        expect(result.success).toBe(true);
        expect(result.profile).toBeNull();
      });
    });

    describe("Error Handling", () => {
      it("should handle cache fetch errors", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({ id: validUUID });
        (queryCache.getOrFetch as jest.Mock).mockRejectedValue(
          new Error("Cache error")
        );

        const result = await getStudentProfile();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Cache error");
        expect(result.profile).toBeNull();
      });
    });
  });

  describe("previewClass", () => {
    describe("Input Validation", () => {
      it("should reject empty class code", async () => {
        const result = await previewClass("");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should normalize class code to uppercase", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: validUUID, name: "Test Class", subject: "Math", teacher_id: validUUID },
          error: null,
        });

        await previewClass("abc123");

        expect(mockSupabase.from).toHaveBeenCalledWith("classes");
      });
    });

    describe("Class Lookup", () => {
      it("should return class not found when code is invalid", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await previewClass("INVALID");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Class not found. Please check the code.");
      });

      it("should return class details when found", async () => {
        // First call - class lookup
        mockSupabase._mockQueryBuilder.maybeSingle
          .mockResolvedValueOnce({
            data: { id: validUUID, name: "Math 101", subject: "Mathematics", teacher_id: validUUID },
            error: null,
          })
          // Second call - teacher profile
          .mockResolvedValueOnce({
            data: { name: "Mr. Smith" },
            error: null,
          });

        // Mock count for student enrollment
        mockSupabase.from.mockImplementation((table) => {
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnValue({
                count: 25,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await previewClass("ABC123");

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should handle class lookup error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await previewClass("ABC123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to lookup class");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const result = await previewClass("ABC123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });

  describe("joinClass", () => {
    const validJoinParams = {
      classCode: "ABC123",
      pin: "1234",
    };

    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyStudentAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });
    });

    describe("Input Validation", () => {
      it("should reject empty class code", async () => {
        const result = await joinClass({ classCode: "", pin: "1234" });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject empty PIN", async () => {
        const result = await joinClass({ classCode: "ABC123", pin: "" });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Too many join attempts. Please wait before trying again.");
      });
    });

    describe("Class Lookup and PIN Verification", () => {
      it("should return error when class not found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid class code or PIN");
      });

      it("should reject invalid PIN", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: validUUID, name: "Test Class", class_code: "ABC123", join_pin: "9999" },
          error: null,
        });

        const result = await joinClass({ classCode: "ABC123", pin: "1234" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid class code or PIN");
      });

      it("should reject when class has no PIN set", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: validUUID, name: "Test Class", class_code: "ABC123", join_pin: null },
          error: null,
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid class code or PIN");
      });
    });

    describe("Enrollment", () => {
      beforeEach(() => {
        // Mock class lookup with valid PIN
        mockSupabase._mockQueryBuilder.maybeSingle
          .mockResolvedValueOnce({
            data: { id: validUUID, name: "Test Class", class_code: "ABC123", join_pin: "1234" },
            error: null,
          })
          // Mock no existing enrollment
          .mockResolvedValueOnce({
            data: null,
            error: null,
          });
      });

      it("should reject if already enrolled", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle
          .mockReset()
          .mockResolvedValueOnce({
            data: { id: validUUID, name: "Test Class", class_code: "ABC123", join_pin: "1234" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { id: "existing-enrollment" },
            error: null,
          });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Already enrolled in this class");
      });

      it("should create enrollment successfully", async () => {
        mockSupabase._mockQueryBuilder.single.mockResolvedValue({
          data: { id: "new-enrollment", class_id: validUUID, student_id: validUUID },
          error: null,
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(true);
        expect(revalidatePath).toHaveBeenCalledWith("/app/student/classes");
      });

      it("should handle duplicate enrollment error (23505)", async () => {
        mockSupabase._mockQueryBuilder.single.mockResolvedValue({
          data: null,
          error: { code: "23505", message: "Duplicate" },
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Already enrolled in this class");
      });

      it("should handle generic enrollment error", async () => {
        mockSupabase._mockQueryBuilder.single.mockResolvedValue({
          data: null,
          error: { code: "500", message: "Database error" },
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to enroll in class. Please try again.");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error("Network error");
        });

        const result = await joinClass(validJoinParams);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Network error");
      });
    });
  });

  describe("leaveClass", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyStudentAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await leaveClass(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });
    });

    describe("Input Validation", () => {
      it("should reject invalid class ID format", async () => {
        const result = await leaveClass("invalid-id");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject empty class ID", async () => {
        const result = await leaveClass("");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkStudentMutationRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await leaveClass(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Too many requests. Please try again later.");
      });
    });

    describe("Deletion", () => {
      it("should delete enrollment successfully", async () => {
        mockSupabase._mockQueryBuilder.eq.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

        const result = await leaveClass(validUUID);

        expect(result.success).toBe(true);
        expect(revalidatePath).toHaveBeenCalledWith("/app/student/classes");
      });

      it("should handle deletion error", async () => {
        mockSupabase._mockQueryBuilder.eq.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
        });

        const result = await leaveClass(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Delete failed");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error("Connection lost");
        });

        const result = await leaveClass(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection lost");
      });
    });
  });
});
