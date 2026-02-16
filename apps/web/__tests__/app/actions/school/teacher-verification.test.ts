/**
 * Tests for teacher-verification.ts
 * Tests teacher credential verification and profile creation
 */

// Mock dependencies before imports
const mockGetCurrentUser = jest.fn();
const mockCreateAdminClient = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
  getCurrentUser: () => mockGetCurrentUser(),
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
    teacherVerification: { windowMs: 3600000, max: 5 },
  },
}));

jest.mock("@/lib/validation-schemas", () => ({
  SchoolCodeSchema: {
    parse: jest.fn((value) => {
      if (!value || value.length < 2) {
        throw new Error("Invalid school code");
      }
      return value.trim().toUpperCase();
    }),
  },
  StaffPinSchema: {
    parse: jest.fn((value) => {
      if (!value || value.length !== 6) {
        throw new Error("Invalid PIN");
      }
      return value;
    }),
  },
  TeacherNameSchema: {
    parse: jest.fn((value) => {
      if (!value || value.length < 2) {
        throw new Error("Invalid name");
      }
      return value.trim();
    }),
  },
  PhoneSchema: {
    parse: jest.fn((value) => {
      if (!value || value.length < 10) {
        throw new Error("Invalid phone");
      }
      return value;
    }),
  },
}));

jest.mock("@/app/actions/school/school-utils", () => ({
  normalizeSchoolCode: jest.fn((code) => code.toUpperCase().trim()),
  handleZodValidationError: jest.fn((error) => ({
    success: false,
    error: error.message || "Validation error",
  })),
}));

import { verifyTeacher } from "@/app/actions/school/teacher-verification";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { authLogger } from "@/lib/auth-logger";

const mockCheckRateLimit = checkRateLimit as jest.Mock;

describe("teacher-verification", () => {
  let mockAdminClient: {
    from: jest.Mock;
    rpc: jest.Mock;
    auth: {
      admin: {
        updateUserById: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminClient = {
      from: jest.fn(),
      rpc: jest.fn(),
      auth: {
        admin: {
          updateUserById: jest.fn(),
        },
      },
    };

    mockCreateAdminClient.mockResolvedValue(mockAdminClient);
    mockGetCurrentUser.mockResolvedValue({ id: "user-123", is_anonymous: false });
    mockCheckRateLimit.mockResolvedValue(true);
  });

  describe("verifyTeacher", () => {
    const validParams = {
      schoolCode: "SCH001",
      staffPin: "123456",
      teacherName: "John Doe",
      phone: "9876543210",
      subject: "Mathematics",
    };

    it("should return error when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when user is anonymous", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123", is_anonymous: true });

      // Mock empty teacher profile check
      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Anonymous users cannot register");
    });

    it("should return error when user already has teacher profile", async () => {
      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { user_id: "user-123" }, error: null }),
          }),
        }),
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already registered as a teacher");
    });

    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      // Mock no existing teacher profile
      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many verification attempts");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return error when school not found", async () => {
      // First call - check existing teacher profile (none)
      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call - lookup school (not found)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid school code");
    });

    it("should return error when school lookup fails", async () => {
      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
            }),
          }),
        });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to lookup school");
    });

    it("should return error when PIN verification RPC fails", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unable to verify PIN");
    });

    it("should return error when PIN is invalid", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [{ is_valid: false }], error: null });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PIN");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should create teacher profile on successful verification", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [{ is_valid: true }], error: null });
      mockAdminClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(result.schoolId).toBe("school-1");
      expect(result.schoolName).toBe("Test School");
    });

    it("should return error when profile creation fails", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: { message: "Insert failed" } }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [{ is_valid: true }], error: null });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create teacher profile");
    });

    it("should succeed even if app_metadata update fails", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [{ is_valid: true }], error: null });
      mockAdminClient.auth.admin.updateUserById.mockResolvedValue({ error: { message: "Update failed" } });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(true);
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should skip profile creation when teacherName is empty", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [{ is_valid: true }], error: null });

      const result = await verifyTeacher({
        schoolCode: "SCH001",
        staffPin: "123456",
        teacherName: "",
      });

      expect(result.success).toBe(true);
      expect(mockAdminClient.from).toHaveBeenCalledTimes(2); // No insert call
    });

    it("should handle unexpected errors", async () => {
      mockCreateAdminClient.mockRejectedValue(new Error("Connection error"));

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("unexpected error");
    });

    it("should handle PIN verification with no results", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [], error: null });

      const result = await verifyTeacher(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PIN");
    });

    it("should call verify_staff_pin RPC with correct params", async () => {
      const mockSchool = { id: "school-1", school_code: "SCH001", school_name: "Test School" };

      mockAdminClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
            }),
          }),
        });

      mockAdminClient.rpc.mockResolvedValue({ data: [{ is_valid: false }], error: null });

      await verifyTeacher(validParams);

      expect(mockAdminClient.rpc).toHaveBeenCalledWith("verify_staff_pin", {
        p_school_id: "school-1",
        p_pin: "123456",
      });
    });
  });
});
