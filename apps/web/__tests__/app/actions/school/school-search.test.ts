/**
 * Tests for school-search.ts
 * Tests school search and lookup functionality
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
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
    schoolSearch: { windowMs: 60000, max: 30 },
  },
}));

jest.mock("@/lib/validation-schemas", () => ({
  SearchQuerySchema: {
    parse: jest.fn((value) => {
      if (!value || value.length < 2) {
        throw new Error("Query too short");
      }
      return value.trim();
    }),
  },
}));

jest.mock("@/app/actions/school/school-utils", () => ({
  normalizeSchoolCode: jest.fn((code) => code.toUpperCase().trim()),
}));

import { searchSchools, getSchoolByCode } from "@/app/actions/school/school-search";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { authLogger } from "@/lib/auth-logger";
import { SearchQuerySchema } from "@/lib/validation-schemas";

const mockCreateClient = createClient as jest.Mock;
const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockSearchQuerySchema = SearchQuerySchema.parse as jest.Mock;

describe("school-search", () => {
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
    mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
  });

  describe("searchSchools", () => {
    it("should return error when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await searchSchools("test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(result.data).toEqual([]);
    });

    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await searchSchools("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many search requests");
      expect(result.data).toEqual([]);
    });

    it("should return schools matching the query", async () => {
      const mockSchools = [
        { id: "1", school_code: "SCH001", school_name: "Test School", district: "Test District" },
        { id: "2", school_code: "SCH002", school_name: "Test Academy", district: "Test District" },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockSchools, error: null }),
          }),
        }),
      });

      const result = await searchSchools("test");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchools);
    });

    it("should return empty array when no schools match", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await searchSchools("nonexistent");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should return error on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        }),
      });

      const result = await searchSchools("test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to search schools");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should return error on validation failure", async () => {
      mockSearchQuerySchema.mockImplementationOnce(() => {
        throw new Error("Invalid query");
      });

      const result = await searchSchools("a");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should use rate limit with user ID", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await searchSchools("test");

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "search-schools:user-123",
        expect.any(Object)
      );
    });

    it("should search by both school_code and school_name", async () => {
      const mockOr = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: mockOr,
        }),
      });

      await searchSchools("test");

      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining("school_code.ilike")
      );
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining("school_name.ilike")
      );
    });

    it("should limit results to 20", async () => {
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      });

      await searchSchools("test");

      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it("should return empty data array when data is null", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await searchSchools("test");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("getSchoolByCode", () => {
    it("should return school when found", async () => {
      const mockSchool = {
        id: "1",
        name: "Test School",
        school_code: "SCH001",
        district: "Test District",
        created_at: "2023-01-01",
        updated_at: "2023-01-01",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockSchool, error: null }),
          }),
        }),
      });

      const result = await getSchoolByCode("SCH001");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchool);
    });

    it("should return error when school not found", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await getSchoolByCode("INVALID");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unable to find school");
    });

    it("should return error on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        }),
      });

      const result = await getSchoolByCode("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to lookup school");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should normalize school code before lookup", async () => {
      const mockEq = jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await getSchoolByCode("  sch001  ");

      expect(mockEq).toHaveBeenCalledWith("school_code", "SCH001");
    });

    it("should handle unexpected errors", async () => {
      mockCreateClient.mockRejectedValue(new Error("Connection error"));

      const result = await getSchoolByCode("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });
});
