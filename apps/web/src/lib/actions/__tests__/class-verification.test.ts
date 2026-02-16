/**
 * @jest-environment jsdom
 */
import { verifyClassAccess, verifySchoolAccess } from "../class-verification";

// Mock supabase-server
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

jest.mock("../../supabase-server", () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}));

// Mock auth-logger
jest.mock("../../auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

import { authLogger } from "../../auth-logger";

describe("class-verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReset();
    mockFrom.mockClear();
  });

  describe("verifyClassAccess", () => {
    it("returns error when classId is empty", async () => {
      const result = await verifyClassAccess("", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "Class ID is required",
      });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns success with data when teacher owns class", async () => {
      const classData = {
        id: "class-123",
        teacher_id: "user-123",
        class_name: "Math 101",
      };

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: classData,
            error: null,
          }),
        }),
      });

      const result = await verifyClassAccess("class-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: true,
        data: classData,
      });
      expect(mockFrom).toHaveBeenCalledWith("classes");
    });

    it("returns error when class not found", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await verifyClassAccess("class-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "Class not found",
      });
    });

    it("returns unauthorized when teacher_id does not match", async () => {
      const classData = {
        id: "class-123",
        teacher_id: "other-user",
        class_name: "Math 101",
      };

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: classData,
            error: null,
          }),
        }),
      });

      const result = await verifyClassAccess("class-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "Unauthorized",
      });
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[testFunction] Unauthorized class access attempted",
        expect.objectContaining({
          userId: "user-123",
          classId: "class-123",
          classTeacherId: "other-user",
        })
      );
    });

    it("returns error when Supabase query fails", async () => {
      const supabaseError = { message: "Database error", code: "500" };

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: supabaseError,
          }),
        }),
      });

      const result = await verifyClassAccess("class-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "Failed to fetch class",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testFunction] Error fetching class",
        supabaseError
      );
    });

    it("handles unexpected exceptions", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockRejectedValue(new Error("Network error")),
        }),
      });

      const result = await verifyClassAccess("class-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testFunction] Unexpected error verifying class access",
        expect.any(Error)
      );
    });

    it("handles non-Error exceptions", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockRejectedValue("String error"),
        }),
      });

      const result = await verifyClassAccess("class-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testFunction] Unexpected error verifying class access",
        { error: "String error" }
      );
    });
  });

  describe("verifySchoolAccess", () => {
    it("returns error when schoolId is empty", async () => {
      const result = await verifySchoolAccess("", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "School ID is required",
      });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns success with data when school exists", async () => {
      const schoolData = {
        id: "school-123",
        admin_id: "admin-456",
      };

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: schoolData,
            error: null,
          }),
        }),
      });

      const result = await verifySchoolAccess("school-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: true,
        data: schoolData,
      });
      expect(mockFrom).toHaveBeenCalledWith("schools");
    });

    it("returns error when school not found", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await verifySchoolAccess("school-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "School not found",
      });
    });

    it("returns error when Supabase query fails", async () => {
      const supabaseError = { message: "Database error", code: "500" };

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: supabaseError,
          }),
        }),
      });

      const result = await verifySchoolAccess("school-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "Failed to fetch school",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testFunction] Error fetching school",
        supabaseError
      );
    });

    it("handles unexpected exceptions", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockRejectedValue(new Error("Network error")),
        }),
      });

      const result = await verifySchoolAccess("school-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testFunction] Unexpected error verifying school access",
        expect.any(Error)
      );
    });

    it("handles non-Error exceptions", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockRejectedValue("String error"),
        }),
      });

      const result = await verifySchoolAccess("school-123", "user-123", "testFunction");

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testFunction] Unexpected error verifying school access",
        { error: "String error" }
      );
    });
  });
});
