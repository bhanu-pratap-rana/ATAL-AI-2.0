/**
 * Tests for admin-pin-management.ts server actions
 * Target: ~25 tests covering getSchoolPINInfo, rotateSchoolPIN, getAllSchoolsWithPINs, getPINStatistics
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
  verifyAdminAuth: jest.fn(),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(() => true),
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
  getSchoolPINInfo,
  rotateSchoolPIN,
  getAllSchoolsWithPINs,
  getPINStatistics,
} from "@/app/actions/admin-pin-management";
import {
  createClient,
  createAdminClient,
  verifyAdminAuth,
} from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: [{ success: true }], error: null }),
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("admin-pin-management", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAdminSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockAdminSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as jest.Mock).mockResolvedValue(mockAdminSupabase);
    (verifyAdminAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: validUUID, email: "admin@test.com" },
    });
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("getSchoolPINInfo", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyAdminAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authorized" },
        });

        const result = await getSchoolPINInfo(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authorized");
      });
    });

    describe("Input Validation", () => {
      it("should reject empty school ID", async () => {
        const result = await getSchoolPINInfo("");

        expect(result.success).toBe(false);
        expect(result.error).toBe("School ID is required");
      });
    });

    describe("School Lookup", () => {
      it("should return error when school not found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await getSchoolPINInfo(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("School not found");
      });

      it("should handle school lookup error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await getSchoolPINInfo(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to lookup school");
      });

      it("should return school PIN info when found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: {
            id: validUUID,
            school_name: "Test School",
            school_code: "SCH001",
            district: "Test District",
          },
          error: null,
        });
        mockAdminSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: {
            created_at: "2024-01-01T00:00:00Z",
            rotated_at: "2024-01-15T00:00:00Z",
          },
          error: null,
        });

        const result = await getSchoolPINInfo(validUUID);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should handle missing PIN data gracefully", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: {
            id: validUUID,
            school_name: "Test School",
            school_code: null,
            district: null,
          },
          error: null,
        });
        mockAdminSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await getSchoolPINInfo(validUUID);

        expect(result.success).toBe(true);
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

        const result = await getSchoolPINInfo(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });

  describe("rotateSchoolPIN", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyAdminAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authorized" },
        });

        const result = await rotateSchoolPIN(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authorized");
      });
    });

    describe("Input Validation", () => {
      it("should reject empty school ID", async () => {
        const result = await rotateSchoolPIN("");

        expect(result.success).toBe(false);
        expect(result.error).toBe("School ID is required");
      });

      it("should reject invalid custom PIN format", async () => {
        const result = await rotateSchoolPIN(validUUID, "abc");

        expect(result.success).toBe(false);
        expect(result.error).toBe("PIN must be 4-6 digits");
      });

      it("should reject PIN with wrong length", async () => {
        const result = await rotateSchoolPIN(validUUID, "12");

        expect(result.success).toBe(false);
        expect(result.error).toBe("PIN must be 4-6 digits");
      });

      it("should accept valid 4-digit custom PIN", async () => {
        const result = await rotateSchoolPIN(validUUID, "1234");

        expect(result.success).toBe(true);
      });

      it("should accept valid 6-digit custom PIN", async () => {
        const result = await rotateSchoolPIN(validUUID, "123456");

        expect(result.success).toBe(true);
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await rotateSchoolPIN(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many PIN rotation requests");
      });
    });

    describe("PIN Rotation", () => {
      it("should call rotate_staff_pin RPC with correct params", async () => {
        await rotateSchoolPIN(validUUID, "4567");

        expect(mockAdminSupabase.rpc).toHaveBeenCalledWith("rotate_staff_pin", {
          p_school_id: validUUID,
          p_new_pin: "4567",
        });
      });

      it("should handle RPC error", async () => {
        mockAdminSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: "RPC failed" },
        });

        const result = await rotateSchoolPIN(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("RPC failed");
      });

      it("should handle RPC returning failure", async () => {
        mockAdminSupabase.rpc.mockResolvedValue({
          data: [{ success: false, error_message: "School not found" }],
          error: null,
        });

        const result = await rotateSchoolPIN(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("School not found");
      });

      it("should return new PIN on success", async () => {
        const result = await rotateSchoolPIN(validUUID, "9999");

        expect(result.success).toBe(true);
        expect(result.message).toContain("PIN rotated successfully");
        expect((result.data as { newPIN: string }).newPIN).toBe("9999");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createAdminClient as jest.Mock).mockRejectedValue(new Error("Admin client failed"));

        const result = await rotateSchoolPIN(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred while rotating PIN");
      });
    });
  });

  describe("getAllSchoolsWithPINs", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyAdminAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authorized" },
        });

        const result = await getAllSchoolsWithPINs();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authorized");
      });
    });

    describe("Data Retrieval", () => {
      it("should return schools with PIN info", async () => {
        mockSupabase._mockQueryBuilder.order.mockResolvedValue({
          data: [
            { id: "1", school_name: "School A", school_code: "A001", district: "District A" },
            { id: "2", school_name: "School B", school_code: null, district: null },
          ],
          error: null,
        });
        mockAdminSupabase._mockQueryBuilder.select.mockResolvedValue({
          data: [
            { school_id: "1", created_at: "2024-01-01", rotated_at: "2024-01-15" },
          ],
          error: null,
        });

        const result = await getAllSchoolsWithPINs();

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should handle school fetch error", async () => {
        mockSupabase._mockQueryBuilder.order.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await getAllSchoolsWithPINs();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch schools");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

        const result = await getAllSchoolsWithPINs();

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });

  describe("getPINStatistics", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyAdminAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authorized" },
        });

        const result = await getPINStatistics();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authorized");
      });
    });

    describe("Statistics Calculation", () => {
      it("should return PIN statistics", async () => {
        // Mock total schools count
        mockSupabase.from.mockImplementation((table) => {
          if (table === "schools") {
            return {
              select: jest.fn().mockResolvedValue({ count: 10, error: null }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });
        // Mock schools with PINs count
        mockAdminSupabase.from.mockImplementation((table) => {
          if (table === "school_staff_credentials") {
            return {
              select: jest.fn().mockReturnThis(),
              is: jest.fn().mockResolvedValue({ count: 7, error: null }),
            };
          }
          return mockAdminSupabase._mockQueryBuilder;
        });

        const result = await getPINStatistics();

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty("totalSchools");
        expect(result.data).toHaveProperty("schoolsWithPINs");
        expect(result.data).toHaveProperty("schoolsWithoutPINs");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

        const result = await getPINStatistics();

        expect(result.success).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });
});
