/**
 * Tests for school-search.ts
 * Target: ~20 tests covering school search and lookup functionality
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
  },
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    schoolSearch: { maxTokens: 20, refillRate: 0.3, refillInterval: 1000 },
  },
}));

jest.mock("@/lib/validation-schemas", () => ({
  SearchQuerySchema: {
    parse: jest.fn((query) => {
      if (!query || query.length < 1) {
        throw new Error("Query too short");
      }
      return query;
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

describe("school-search", () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-123" });
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("searchSchools", () => {
    const mockSchools = [
      { id: "1", school_code: "SCH001", school_name: "Test School", district: "District A" },
      { id: "2", school_code: "SCH002", school_name: "Another School", district: "District B" },
    ];

    beforeEach(() => {
      mockSupabase.limit.mockResolvedValue({ data: mockSchools, error: null });
    });

    it("should return schools matching the query", async () => {
      const result = await searchSchools("Test");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchools);
    });

    it("should call Supabase with correct query parameters", async () => {
      await searchSchools("SCH001");

      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
      expect(mockSupabase.select).toHaveBeenCalledWith("id, school_code, school_name, district");
      expect(mockSupabase.or).toHaveBeenCalled();
      expect(mockSupabase.limit).toHaveBeenCalledWith(20);
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await searchSchools("Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(result.data).toEqual([]);
    });

    it("should return error when rate limit exceeded", async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue(false);

      const result = await searchSchools("Test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many search requests");
      expect(result.data).toEqual([]);
    });

    it("should check rate limit for the user", async () => {
      await searchSchools("Test");

      expect(checkRateLimit).toHaveBeenCalledWith(
        "search-schools:user-123",
        expect.any(Object)
      );
    });

    it("should return error when database query fails", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await searchSchools("Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to search schools");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should return empty array when no schools found", async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const result = await searchSchools("NonExistent");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should handle null data response", async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: null });

      const result = await searchSchools("Test");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should handle validation errors", async () => {
      const { SearchQuerySchema } = require("@/lib/validation-schemas");
      SearchQuerySchema.parse.mockImplementationOnce(() => {
        throw new Error("Validation failed");
      });

      const result = await searchSchools("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should handle unexpected errors", async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

      const result = await searchSchools("Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe("getSchoolByCode", () => {
    const mockSchool = {
      id: "1",
      name: "Test School",
      school_code: "SCH001",
      district: "District A",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    beforeEach(() => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockSchool, error: null });
    });

    it("should return school by code", async () => {
      const result = await getSchoolByCode("SCH001");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchool);
    });

    it("should normalize school code before lookup", async () => {
      const { normalizeSchoolCode } = require("@/app/actions/school/school-utils");

      await getSchoolByCode("  sch001  ");

      expect(normalizeSchoolCode).toHaveBeenCalledWith("  sch001  ");
    });

    it("should call Supabase with correct parameters", async () => {
      await getSchoolByCode("SCH001");

      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
      expect(mockSupabase.select).toHaveBeenCalledWith(
        "id, name, school_code, district, created_at, updated_at"
      );
      expect(mockSupabase.eq).toHaveBeenCalled();
      expect(mockSupabase.maybeSingle).toHaveBeenCalled();
    });

    it("should return error when school not found", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await getSchoolByCode("NONEXISTENT");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unable to find school");
      expect(authLogger.debug).toHaveBeenCalled();
    });

    it("should return error when database query fails", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await getSchoolByCode("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to lookup school");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

      const result = await getSchoolByCode("SCH001");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(authLogger.error).toHaveBeenCalled();
    });
  });
});
