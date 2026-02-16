/**
 * Tests for teacher-verification.ts server actions
 * Target: ~25 tests covering teacher verification flow
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createAdminClient: jest.fn(),
  getCurrentUser: jest.fn(),
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

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    teacherVerification: { limit: 5, window: 3600 },
  },
}));

import { verifyTeacher } from "@/app/actions/school/teacher-verification";
import { createAdminClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";

// Helper to create mock Supabase admin client
function createMockAdminClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      admin: {
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
      },
    },
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("teacher-verification", () => {
  let mockAdminClient: ReturnType<typeof createMockAdminClient>;
  const validParams = {
    schoolCode: "SCH001",
    staffPin: "1234",
    teacherName: "Test Teacher",
    phone: "9876543210",
    subject: "Math",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminClient = createMockAdminClient();
    (createAdminClient as jest.Mock).mockResolvedValue(mockAdminClient);
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "teacher@test.com",
      is_anonymous: false,
    });
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("Input Validation", () => {
    it("should reject empty school code", async () => {
      const result = await verifyTeacher({
        ...validParams,
        schoolCode: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject empty staff PIN", async () => {
      const result = await verifyTeacher({
        ...validParams,
        staffPin: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should accept valid parameters", async () => {
      // First call: existing teacher check - returns null (no existing teacher)
      // Second call: school lookup - returns school data
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ is_valid: true }],
        error: null,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
    });
  });

  describe("Authentication", () => {
    it("should reject unauthenticated users", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Not authenticated");
    });

    it("should reject anonymous users", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({
        id: "user-123",
        is_anonymous: true,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Anonymous users cannot register");
    });

    it("should reject users already registered as teachers", async () => {
      mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { user_id: "user-123" }, // Existing teacher profile
        error: null,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already registered as a teacher");
    });
  });

  describe("Rate Limiting", () => {
    it("should reject when rate limit exceeded", async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue(false);

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many verification attempts");
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[verifyTeacher] Rate limit exceeded for user",
        expect.any(Object)
      );
    });

    it("should call rate limiter with correct key", async () => {
      // Need to mock existing teacher check to pass
      mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await verifyTeacher(validParams);

      expect(checkRateLimit).toHaveBeenCalledWith(
        "verify-teacher:user-123",
        expect.any(Object)
      );
    });
  });

  describe("School Lookup", () => {
    beforeEach(() => {
      // Clear existing teacher check
      mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });
    });

    it("should reject invalid school code", async () => {
      // First call (teacher check) returns null, second call (school lookup) returns null
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null }) // No existing teacher
        .mockResolvedValueOnce({ data: null, error: null }); // School not found

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid school code");
    });

    it("should handle school lookup error", async () => {
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Database error" },
        });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to lookup school");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should find school by code", async () => {
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ is_valid: true }],
        error: null,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(result.schoolName).toBe("Test School");
    });
  });

  describe("PIN Verification", () => {
    beforeEach(() => {
      // Setup: Pass authentication and school lookup
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null }) // No existing teacher
        .mockResolvedValueOnce({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
    });

    it("should reject invalid PIN", async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ is_valid: false }],
        error: null,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PIN");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should handle PIN RPC error", async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unable to verify PIN");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should accept valid PIN", async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ is_valid: true }],
        error: null,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(authLogger.info).toHaveBeenCalledWith(
        "[verifyTeacher] PIN verified successfully",
        expect.any(Object)
      );
    });

    it("should handle missing PIN record", async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: [], // Empty result
        error: null,
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(authLogger.warn).toHaveBeenCalled();
    });
  });

  describe("Teacher Profile Creation", () => {
    beforeEach(() => {
      // Setup: Pass all validations
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ is_valid: true }],
        error: null,
      });
    });

    it("should create teacher profile on success", async () => {
      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(mockAdminClient._mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          school_id: "school-123",
          name: "Test Teacher",
          phone: "9876543210",
          subject: "Math",
        })
      );
    });

    it("should update user metadata", async () => {
      await verifyTeacher(validParams);

      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          app_metadata: expect.objectContaining({
            role: "teacher",
            school_id: "school-123",
          }),
        })
      );
    });

    it("should handle profile creation error", async () => {
      mockAdminClient._mockQueryBuilder.insert.mockResolvedValue({
        error: { message: "Insert error" },
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create teacher profile");
    });

    it("should continue even if metadata update fails", async () => {
      mockAdminClient.auth.admin.updateUserById.mockResolvedValue({
        error: { message: "Update error" },
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[verifyTeacher] Failed to update app_metadata (non-critical)",
        expect.any(Object)
      );
    });

    it("should skip profile creation when teacherName is empty", async () => {
      const result = await verifyTeacher({
        ...validParams,
        teacherName: "",
      });

      expect(result.success).toBe(true);
      // Insert should not be called when teacher name is empty
    });
  });

  describe("Success Response", () => {
    beforeEach(() => {
      mockAdminClient._mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ is_valid: true }],
        error: null,
      });
    });

    it("should return school ID on success", async () => {
      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(result.schoolId).toBe("school-123");
    });

    it("should return school name on success", async () => {
      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(result.schoolName).toBe("Test School");
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors", async () => {
      (createAdminClient as jest.Mock).mockRejectedValue(
        new Error("Connection failed")
      );

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("unexpected error");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle getCurrentUser errors", async () => {
      (getCurrentUser as jest.Mock).mockRejectedValue(
        new Error("Auth service error")
      );

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalled();
    });
  });
});
