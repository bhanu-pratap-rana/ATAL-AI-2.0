/**
 * Tests for database/query-wrappers.ts
 * Tests database query wrapper functions
 */

// Mock the auth logger first
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create mock functions
const mockMaybeSingle = jest.fn();
const mockOrder = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();

// Helper to create query chain
const createQueryChain = () => ({
  select: mockSelect,
  eq: mockEq,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  is: mockIs,
});

// Mock createClient with proper chaining
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn().mockImplementation(async () => ({
    from: jest.fn(() => createQueryChain()),
  })),
  createAdminClient: jest.fn().mockImplementation(async () => ({
    from: jest.fn(() => createQueryChain()),
  })),
}));

import {
  fetchSchoolRecord,
  fetchSchoolPINCredentials,
  fetchAllSchools,
  countSchools,
  countSchoolsWithPINs,
  fetchAllSchoolPINs,
} from "@/lib/database/query-wrappers";
import { authLogger } from "@/lib/auth-logger";

describe("query-wrappers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default chain that returns empty results
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      is: mockIs,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
      is: mockIs,
    });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockIs.mockResolvedValue({ count: 0, error: null });
  });

  describe("fetchSchoolRecord", () => {
    it("should return school data on success", async () => {
      const mockSchool = {
        id: "school-123",
        school_name: "Test School",
        school_code: "TS001",
        district: "Test District",
      };
      mockMaybeSingle.mockResolvedValue({ data: mockSchool, error: null });

      const result = await fetchSchoolRecord("school-123", "testFunction");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockSchool);
      }
    });

    it("should return error when school not found", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await fetchSchoolRecord("school-123", "testFunction");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("School not found");
      }
    });

    it("should return error on database error", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await fetchSchoolRecord("school-123", "testFunction");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch school");
      }
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle exceptions gracefully", async () => {
      mockMaybeSingle.mockRejectedValue(new Error("Network error"));

      const result = await fetchSchoolRecord("school-123", "testFunction");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("An unexpected error occurred");
      }
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe("fetchSchoolPINCredentials", () => {
    it("should return PIN credentials on success", async () => {
      const mockCredentials = {
        created_at: "2024-01-01T00:00:00Z",
        rotated_at: null,
        updated_at: "2024-01-01T00:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: mockCredentials, error: null });

      const result = await fetchSchoolPINCredentials("school-123", "testFunction");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCredentials);
    });

    it("should return null data when no credentials exist", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await fetchSchoolPINCredentials("school-123", "testFunction");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should return success with null on query error", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await fetchSchoolPINCredentials("school-123", "testFunction");

      // The function doesn't fail on error - just returns success with null
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle exceptions gracefully", async () => {
      mockMaybeSingle.mockRejectedValue(new Error("Network error"));

      const result = await fetchSchoolPINCredentials("school-123", "testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch PIN credentials");
    });
  });

  describe("fetchAllSchools", () => {
    it("should return all schools on success", async () => {
      const mockSchools = [
        { id: "1", school_name: "School A", school_code: "SA001", district: "D1" },
        { id: "2", school_name: "School B", school_code: "SB001", district: "D2" },
      ];
      mockOrder.mockResolvedValue({ data: mockSchools, error: null });

      const result = await fetchAllSchools("testFunction");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockSchools);
      }
    });

    it("should return empty array when no schools exist", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchAllSchools("testFunction");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("should return error on database error", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await fetchAllSchools("testFunction");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch schools");
      }
    });

    it("should handle exceptions gracefully", async () => {
      mockOrder.mockRejectedValue(new Error("Network error"));

      const result = await fetchAllSchools("testFunction");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("An unexpected error occurred");
      }
    });
  });

  describe("countSchools", () => {
    it("should return count on success", async () => {
      // For count queries, select returns a promise directly
      mockSelect.mockResolvedValue({ count: 10, error: null });

      const result = await countSchools("testFunction");

      expect(result.success).toBe(true);
      expect(result.count).toBe(10);
    });

    it("should return 0 when count is null", async () => {
      mockSelect.mockResolvedValue({ count: null, error: null });

      const result = await countSchools("testFunction");

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it("should return error on database error", async () => {
      mockSelect.mockResolvedValue({
        count: null,
        error: { message: "Database error" },
      });

      const result = await countSchools("testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to count schools");
      expect(result.count).toBe(0);
    });

    it("should handle exceptions gracefully", async () => {
      mockSelect.mockRejectedValue(new Error("Network error"));

      const result = await countSchools("testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(result.count).toBe(0);
    });
  });

  describe("countSchoolsWithPINs", () => {
    it("should return count on success", async () => {
      mockIs.mockResolvedValue({ count: 5, error: null });

      const result = await countSchoolsWithPINs("testFunction");

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
    });

    it("should return 0 when count is null", async () => {
      mockIs.mockResolvedValue({ count: null, error: null });

      const result = await countSchoolsWithPINs("testFunction");

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it("should return error on database error", async () => {
      mockIs.mockResolvedValue({
        count: null,
        error: { message: "Database error" },
      });

      const result = await countSchoolsWithPINs("testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to count PIN credentials");
      expect(result.count).toBe(0);
    });

    it("should handle exceptions gracefully", async () => {
      mockIs.mockRejectedValue(new Error("Network error"));

      const result = await countSchoolsWithPINs("testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(result.count).toBe(0);
    });
  });

  describe("fetchAllSchoolPINs", () => {
    it("should return all PIN credentials on success", async () => {
      const mockPins = [
        { school_id: "1", created_at: "2024-01-01", rotated_at: null },
        { school_id: "2", created_at: "2024-02-01", rotated_at: "2024-03-01" },
      ];
      // For this query, select returns a promise directly
      mockSelect.mockResolvedValue({ data: mockPins, error: null });

      const result = await fetchAllSchoolPINs("testFunction");

      expect(result.success).toBe(true);
      expect(result.pins).toEqual(mockPins);
    });

    it("should return empty array when no PINs exist", async () => {
      mockSelect.mockResolvedValue({ data: null, error: null });

      const result = await fetchAllSchoolPINs("testFunction");

      expect(result.success).toBe(true);
      expect(result.pins).toEqual([]);
    });

    it("should return error on database error", async () => {
      mockSelect.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await fetchAllSchoolPINs("testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch PIN credentials");
      expect(result.pins).toEqual([]);
    });

    it("should handle exceptions gracefully", async () => {
      mockSelect.mockRejectedValue(new Error("Network error"));

      const result = await fetchAllSchoolPINs("testFunction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(result.pins).toEqual([]);
    });
  });
});
