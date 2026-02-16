/**
 * Tests for staff-pin-management.ts server actions
 * Target: ~20 tests covering PIN rotation flow
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
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

import { rotateStaffPin } from "@/app/actions/school/staff-pin-management";
import {
  createClient,
  createAdminClient,
  getCurrentUser,
} from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

// Helper to create mock Admin client
function createMockAdminClient(overrides: Record<string, unknown> = {}) {
  return {
    rpc: jest.fn().mockResolvedValue({
      data: [{ success: true }],
      error: null,
    }),
    ...overrides,
  };
}

describe("staff-pin-management", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAdminClient: ReturnType<typeof createMockAdminClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockAdminClient = createMockAdminClient();

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as jest.Mock).mockResolvedValue(mockAdminClient);
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "admin@test.com",
      app_metadata: { role: "admin" },
    });
  });

  describe("rotateStaffPin", () => {
    describe("Input Validation", () => {
      it("should reject empty school code", async () => {
        const result = await rotateStaffPin("", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject empty PIN", async () => {
        const result = await rotateStaffPin("SCH001", "");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject PIN less than 4 characters", async () => {
        const result = await rotateStaffPin("SCH001", "123");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        // Validation comes from Zod schema
      });
    });

    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Not authenticated");
        expect(authLogger.warn).toHaveBeenCalled();
      });
    });

    describe("Authorization", () => {
      it("should allow admin users", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
      });

      it("should allow super_admin users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          app_metadata: { role: "super_admin" },
        });
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
      });

      it("should allow teacher users for their own school", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          app_metadata: { role: "teacher" },
        });
        // First call: school lookup
        // Second call: teacher profile check for school authorization
        mockSupabase._mockQueryBuilder.maybeSingle
          .mockResolvedValueOnce({
            data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { school_id: "school-123" },
            error: null,
          });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
      });

      it("should reject teacher users for other schools", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          app_metadata: { role: "teacher" },
        });
        mockSupabase._mockQueryBuilder.maybeSingle
          .mockResolvedValueOnce({
            data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { school_id: "different-school" }, // Different school
            error: null,
          });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("only rotate PINs for your own school");
      });

      it("should reject unauthorized roles", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          app_metadata: { role: "student" },
        });
        // No teacher profile found
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Unauthorized");
        expect(authLogger.warn).toHaveBeenCalled();
      });

      it("should check teacher profile for users without role", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          app_metadata: {}, // No role
        });
        // First call: teacher profile check (for auth)
        // Second call: school lookup
        // Third call: teacher profile check (for school)
        mockSupabase._mockQueryBuilder.maybeSingle
          .mockResolvedValueOnce({
            data: { user_id: "user-123", school_id: "school-123" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { school_id: "school-123" },
            error: null,
          });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
      });
    });

    describe("School Lookup", () => {
      it("should reject invalid school code", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await rotateStaffPin("INVALID", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Unable to rotate PIN");
      });

      it("should handle school lookup error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to lookup school");
        expect(authLogger.error).toHaveBeenCalled();
      });
    });

    describe("PIN Rotation RPC", () => {
      beforeEach(() => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
      });

      it("should call rotate_staff_pin RPC", async () => {
        await rotateStaffPin("SCH001", "1234");

        expect(mockAdminClient.rpc).toHaveBeenCalledWith("rotate_staff_pin", {
          p_school_id: "school-123",
          p_new_pin: "1234",
        });
      });

      it("should handle RPC error", async () => {
        mockAdminClient.rpc.mockResolvedValue({
          data: null,
          error: { message: "RPC failed" },
        });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to rotate PIN");
        expect(authLogger.error).toHaveBeenCalled();
      });

      it("should handle RPC returning failure", async () => {
        mockAdminClient.rpc.mockResolvedValue({
          data: [{ success: false, error_message: "PIN rotation failed" }],
          error: null,
        });

        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(false);
        expect(result.error).toContain("PIN rotation failed");
      });
    });

    describe("Success Response", () => {
      beforeEach(() => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { id: "school-123", school_code: "SCH001", school_name: "Test School" },
          error: null,
        });
      });

      it("should return school code on success", async () => {
        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
        expect(result.schoolCode).toBe("SCH001");
      });

      it("should return school name on success", async () => {
        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
        expect(result.schoolName).toBe("Test School");
      });

      it("should return rotatedAt timestamp on success", async () => {
        const result = await rotateStaffPin("SCH001", "1234");

        expect(result.success).toBe(true);
        expect(result.rotatedAt).toBeDefined();
        expect(typeof result.rotatedAt).toBe("string");
      });

      it("should log success", async () => {
        await rotateStaffPin("SCH001", "1234");

        expect(authLogger.success).toHaveBeenCalledWith(
          "[rotateStaffPin] PIN rotated successfully",
          expect.objectContaining({
            schoolId: "school-123",
          })
        );
      });
    });
  });
});
