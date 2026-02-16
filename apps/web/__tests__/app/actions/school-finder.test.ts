/**
 * Tests for school-finder.ts
 * Tests district, block, and school lookup functions
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
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
  checkSchoolFinderRateLimit: jest.fn(),
}));

import {
  getDistricts,
  getBlocksByDistrict,
  getSchoolsByDistrictAndBlock,
  getSchoolPinStatus,
} from "@/app/actions/school-finder";
import { createClient } from "@/lib/supabase-server";
import { checkSchoolFinderRateLimit } from "@/lib/rate-limiter-distributed";
import { authLogger } from "@/lib/auth-logger";

const mockCreateClient = createClient as jest.Mock;
const mockCheckRateLimit = checkSchoolFinderRateLimit as jest.Mock;

describe("school-finder", () => {
  let mockSupabaseClient: {
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      from: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabaseClient);
    mockCheckRateLimit.mockResolvedValue(true);
  });

  describe("getDistricts", () => {
    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await getDistricts();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return unique districts", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { district: "District A" },
              { district: "District A" },
              { district: "District B" },
              { district: "District C" },
            ],
            error: null,
          }),
        }),
      });

      const result = await getDistricts();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toContainEqual({ name: "District A" });
      expect(result.data).toContainEqual({ name: "District B" });
      expect(result.data).toContainEqual({ name: "District C" });
    });

    it("should return empty array when no districts", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await getDistricts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should return error on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "DB error" },
          }),
        }),
      });

      const result = await getDistricts();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch districts");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle null data gracefully", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const result = await getDistricts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should handle unexpected errors", async () => {
      mockCreateClient.mockRejectedValue(new Error("Connection error"));

      const result = await getDistricts();

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });

  describe("getBlocksByDistrict", () => {
    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await getBlocksByDistrict("District A");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return unique blocks for district", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { block: "Block 1", district: "District A" },
                { block: "Block 1", district: "District A" },
                { block: "Block 2", district: "District A" },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await getBlocksByDistrict("District A");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toContainEqual({ name: "Block 1", district: "District A" });
      expect(result.data).toContainEqual({ name: "Block 2", district: "District A" });
    });

    it("should include Unassigned Block when schools have null blocks", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { block: "Block 1", district: "District A" },
                { block: null, district: "District A" },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await getBlocksByDistrict("District A");

      expect(result.success).toBe(true);
      expect(result.data).toContainEqual({
        name: "-- Unassigned Block --",
        district: "District A",
      });
    });

    it("should not include Unassigned Block when all schools have blocks", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ block: "Block 1", district: "District A" }],
              error: null,
            }),
          }),
        }),
      });

      const result = await getBlocksByDistrict("District A");

      expect(result.success).toBe(true);
      expect(result.data).not.toContainEqual(
        expect.objectContaining({ name: "-- Unassigned Block --" })
      );
    });

    it("should return error on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "DB error" },
            }),
          }),
        }),
      });

      const result = await getBlocksByDistrict("District A");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch blocks");
    });

    it("should handle unexpected errors", async () => {
      mockCreateClient.mockRejectedValue(new Error("Network error"));

      const result = await getBlocksByDistrict("District A");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });

  describe("getSchoolsByDistrictAndBlock", () => {
    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await getSchoolsByDistrictAndBlock("District A");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return schools for district", async () => {
      const mockSchools = [
        { id: "1", school_code: "SCH001", school_name: "School A", district: "District A" },
        { id: "2", school_code: "SCH002", school_name: "School B", district: "District A" },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockSchools, error: null }),
          }),
        }),
      });

      const result = await getSchoolsByDistrictAndBlock("District A");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchools);
    });

    it("should filter by block when provided", async () => {
      const mockEq = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      });

      await getSchoolsByDistrictAndBlock("District A", "Block 1");

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("schools");
    });

    it("should filter for null blocks when Unassigned Block selected", async () => {
      const mockIs = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              is: mockIs,
            }),
          }),
        }),
      });

      await getSchoolsByDistrictAndBlock("District A", "-- Unassigned Block --");

      expect(mockIs).toHaveBeenCalledWith("block", null);
    });

    it("should return error on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "DB error" },
            }),
          }),
        }),
      });

      const result = await getSchoolsByDistrictAndBlock("District A");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch schools");
    });

    it("should return empty array when no schools found", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await getSchoolsByDistrictAndBlock("District A");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should handle unexpected errors", async () => {
      mockCreateClient.mockRejectedValue(new Error("Connection error"));

      const result = await getSchoolsByDistrictAndBlock("District A");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });

  describe("getSchoolPinStatus", () => {
    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await getSchoolPinStatus("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
      expect(result.exists).toBe(false);
    });

    it("should normalize school code to uppercase", async () => {
      const mockEq = jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await getSchoolPinStatus("  sch001  ");

      expect(mockEq).toHaveBeenCalledWith("school_code", "SCH001");
    });

    it("should return error when school not found", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await getSchoolPinStatus("INVALID");

      expect(result.success).toBe(false);
      expect(result.error).toBe("School not found");
      expect(result.exists).toBe(false);
    });

    it("should return error on school lookup error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "DB error" },
            }),
          }),
        }),
      });

      const result = await getSchoolPinStatus("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to lookup school");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should return exists: true when PIN exists", async () => {
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "school-1" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: "cred-1",
                  created_at: "2023-01-01",
                  rotated_at: "2023-06-01",
                },
                error: null,
              }),
            }),
          }),
        });

      const result = await getSchoolPinStatus("SCH001");

      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.createdAt).toBe("2023-01-01");
      expect(result.lastRotatedAt).toBe("2023-06-01");
    });

    it("should return exists: false when PIN does not exist", async () => {
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "school-1" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        });

      const result = await getSchoolPinStatus("SCH001");

      expect(result.success).toBe(true);
      expect(result.exists).toBe(false);
    });

    it("should return error on credential lookup error", async () => {
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "school-1" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            }),
          }),
        });

      const result = await getSchoolPinStatus("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to check PIN status");
      expect(result.exists).toBe(false);
    });

    it("should handle unexpected errors", async () => {
      mockCreateClient.mockRejectedValue(new Error("Network error"));

      const result = await getSchoolPinStatus("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(result.exists).toBe(false);
    });
  });
});
