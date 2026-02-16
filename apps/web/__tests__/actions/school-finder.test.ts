/**
 * Tests for school-finder.ts
 * Target: ~25 tests covering school finder actions with rate limiting and Supabase queries
 */

import {
  getDistricts,
  getBlocksByDistrict,
  getSchoolsByDistrictAndBlock,
  getSchoolPinStatus,
} from "@/app/actions/school-finder";

// Mock dependencies
const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn().mockImplementation(async () => ({
    from: jest.fn().mockReturnValue({
      select: mockSelect,
    }),
  })),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkSchoolFinderRateLimit: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { checkSchoolFinderRateLimit } from "@/lib/rate-limiter-distributed";

describe("school-finder actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset chain mocks
    mockSelect.mockReturnThis();
    mockOrder.mockReturnThis();
    mockEq.mockReturnThis();
    mockIs.mockReturnThis();
    mockMaybeSingle.mockReturnThis();

    // Setup default chain behavior
    mockSelect.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
      is: mockIs,
      maybeSingle: mockMaybeSingle,
    });
    mockOrder.mockReturnValue({ data: [], error: null });
    mockEq.mockReturnValue({
      order: mockOrder,
      maybeSingle: mockMaybeSingle,
      is: mockIs,
    });
  });

  describe("getDistricts", () => {
    it("should return unique districts from schools", async () => {
      const schoolsData = [
        { district: "District A" },
        { district: "District B" },
        { district: "District A" }, // Duplicate
        { district: "District C" },
      ];
      mockOrder.mockResolvedValueOnce({ data: schoolsData, error: null });

      const result = await getDistricts();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toEqual([
        { name: "District A" },
        { name: "District B" },
        { name: "District C" },
      ]);
    });

    it("should return empty array when no districts exist", async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const result = await getDistricts();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it("should return error when rate limited", async () => {
      (checkSchoolFinderRateLimit as jest.Mock).mockResolvedValueOnce(false);

      const result = await getDistricts();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return error when query fails", async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const result = await getDistricts();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch districts");
    });

    it("should handle null data gracefully", async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null });

      const result = await getDistricts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("getBlocksByDistrict", () => {
    beforeEach(() => {
      mockEq.mockReturnValue({
        order: mockOrder,
      });
    });

    it("should return unique blocks for a district", async () => {
      const blocksData = [
        { block: "Block A", district: "District 1" },
        { block: "Block B", district: "District 1" },
        { block: "Block A", district: "District 1" }, // Duplicate
      ];
      mockOrder.mockResolvedValueOnce({ data: blocksData, error: null });

      const result = await getBlocksByDistrict("District 1");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("should include 'Unassigned Block' when some schools have null block", async () => {
      const blocksData = [
        { block: "Block A", district: "District 1" },
        { block: null, district: "District 1" }, // Null block
      ];
      mockOrder.mockResolvedValueOnce({ data: blocksData, error: null });

      const result = await getBlocksByDistrict("District 1");

      expect(result.success).toBe(true);
      const blockNames = result.data.map((b) => b.name);
      expect(blockNames).toContain("-- Unassigned Block --");
    });

    it("should not include 'Unassigned Block' when all schools have blocks", async () => {
      const blocksData = [
        { block: "Block A", district: "District 1" },
        { block: "Block B", district: "District 1" },
      ];
      mockOrder.mockResolvedValueOnce({ data: blocksData, error: null });

      const result = await getBlocksByDistrict("District 1");

      expect(result.success).toBe(true);
      const blockNames = result.data.map((b) => b.name);
      expect(blockNames).not.toContain("-- Unassigned Block --");
    });

    it("should return error when rate limited", async () => {
      (checkSchoolFinderRateLimit as jest.Mock).mockResolvedValueOnce(false);

      const result = await getBlocksByDistrict("District 1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return error when query fails", async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const result = await getBlocksByDistrict("District 1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch blocks");
    });
  });

  describe("getSchoolsByDistrictAndBlock", () => {
    beforeEach(() => {
      mockEq.mockReturnValue({
        order: mockOrder,
        eq: mockEq,
        is: mockIs,
      });
      mockIs.mockReturnValue({ data: [], error: null });
    });

    it("should return schools for district without block filter", async () => {
      const schoolsData = [
        {
          id: "1",
          school_code: "SC1",
          school_name: "School 1",
          district: "D1",
          block: "B1",
          address: "Address 1",
        },
        {
          id: "2",
          school_code: "SC2",
          school_name: "School 2",
          district: "D1",
          block: "B1",
          address: "Address 2",
        },
      ];
      mockOrder.mockResolvedValueOnce({ data: schoolsData, error: null });

      const result = await getSchoolsByDistrictAndBlock("D1");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("should filter by block when provided", async () => {
      const schoolsData = [
        {
          id: "1",
          school_code: "SC1",
          school_name: "School 1",
          district: "D1",
          block: "B1",
          address: "Address 1",
        },
      ];
      // Chain: from().select().eq(district).order().eq(block) -> awaits the query
      // The order() returns an object with eq() method for the block filter
      mockOrder.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ data: schoolsData, error: null }),
        is: mockIs,
      });

      const result = await getSchoolsByDistrictAndBlock("D1", "B1");

      expect(result.success).toBe(true);
    });

    it("should handle 'Unassigned Block' filter", async () => {
      const schoolsData = [
        {
          id: "1",
          school_code: "SC1",
          school_name: "Unassigned School",
          district: "D1",
          block: null,
          address: "Address",
        },
      ];
      // Chain: from().select().eq(district).order().is(block, null) -> awaits the query
      // The order() returns an object with is() method for the null block filter
      mockOrder.mockReturnValueOnce({
        eq: mockEq,
        is: jest.fn().mockResolvedValueOnce({ data: schoolsData, error: null }),
      });

      const result = await getSchoolsByDistrictAndBlock(
        "D1",
        "-- Unassigned Block --"
      );

      expect(result.success).toBe(true);
    });

    it("should return error when rate limited", async () => {
      (checkSchoolFinderRateLimit as jest.Mock).mockResolvedValueOnce(false);

      const result = await getSchoolsByDistrictAndBlock("D1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return error when query fails", async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const result = await getSchoolsByDistrictAndBlock("D1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch schools");
    });

    it("should return empty array when no schools found", async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null });

      const result = await getSchoolsByDistrictAndBlock("D1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("getSchoolPinStatus", () => {
    beforeEach(() => {
      // First call: find school by code
      mockMaybeSingle.mockImplementation(() => {
        // Track which query this is
        const currentCallCount = mockMaybeSingle.mock.calls.length;
        if (currentCallCount === 1) {
          // First call - school lookup
          return Promise.resolve({
            data: { id: "school-123" },
            error: null,
          });
        }
        // Second call - credentials lookup
        return Promise.resolve({ data: null, error: null });
      });

      mockEq.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
    });

    it("should return exists:true when PIN exists", async () => {
      // Mock successful school lookup then credentials lookup
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: "school-123" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: "cred-1",
            rotated_at: "2024-01-01",
            created_at: "2024-01-01",
          },
          error: null,
        });

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
    });

    it("should return exists:false when PIN does not exist", async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: "school-123" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(true);
      expect(result.exists).toBe(false);
    });

    it("should normalize school code to uppercase", async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: "school-123" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      await getSchoolPinStatus("sc123");

      // The school code should be normalized before use
      expect(checkSchoolFinderRateLimit).toHaveBeenCalledWith("SC123");
    });

    it("should return error when school not found", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getSchoolPinStatus("INVALID");

      expect(result.success).toBe(false);
      expect(result.error).toBe("School not found");
      expect(result.exists).toBe(false);
    });

    it("should return error when rate limited", async () => {
      (checkSchoolFinderRateLimit as jest.Mock).mockResolvedValueOnce(false);

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return error when school lookup fails", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to lookup school");
    });

    it("should return error when credentials lookup fails", async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: "school-123" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Credentials error" },
        });

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to check PIN status");
    });

    it("should include createdAt and lastRotatedAt when credentials exist", async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: "school-123" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: "cred-1",
            rotated_at: "2024-06-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        });

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(true);
      expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(result.lastRotatedAt).toBe("2024-06-01T00:00:00Z");
    });
  });

  describe("error handling", () => {
    it("should handle unexpected errors in getDistricts", async () => {
      mockSelect.mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await getDistricts();

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should handle unexpected errors in getBlocksByDistrict", async () => {
      mockSelect.mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await getBlocksByDistrict("District 1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should handle unexpected errors in getSchoolsByDistrictAndBlock", async () => {
      mockSelect.mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await getSchoolsByDistrictAndBlock("District 1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should handle unexpected errors in getSchoolPinStatus", async () => {
      mockSelect.mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await getSchoolPinStatus("SC123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });
});
