/**
 * Tests for app/actions/teacher/teacher-class.ts
 * Teacher class CRUD operations
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  verifyTeacherAuth: jest.fn(),
  verifyClassOwnership: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkTeacherMutationRateLimit: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import {
  createClass,
  updateClass,
  deleteClass,
} from "@/app/actions/teacher/teacher-class";
import {
  createClient,
  verifyTeacherAuth,
  verifyClassOwnership,
} from "@/lib/supabase-server";
import { checkTeacherMutationRateLimit } from "@/lib/rate-limiter-distributed";
import { revalidatePath } from "next/cache";
import { authLogger } from "@/lib/auth-logger";

const mockCreateClient = createClient as jest.Mock;
const mockVerifyTeacherAuth = verifyTeacherAuth as jest.Mock;
const mockVerifyClassOwnership = verifyClassOwnership as jest.Mock;
const mockCheckRateLimit = checkTeacherMutationRateLimit as jest.Mock;

describe("teacher-class actions", () => {
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

  describe("createClass", () => {
    it("should return error for invalid input - empty name", async () => {
      const result = await createClass("", "Math");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error for invalid input - name too long", async () => {
      const longName = "a".repeat(101);
      mockVerifyTeacherAuth.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      const result = await createClass(longName, "Math");

      expect(result.success).toBe(false);
    });

    it("should return error when not authorized as teacher", async () => {
      mockVerifyTeacherAuth.mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Not a teacher" },
      });

      const result = await createClass("Math 101", "Mathematics");

      expect(result).toEqual({ success: false, error: "Not a teacher" });
    });

    it("should return error when rate limited", async () => {
      mockVerifyTeacherAuth.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await createClass("Math 101", "Mathematics");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should successfully create a class", async () => {
      mockVerifyTeacherAuth.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      const mockClassData = {
        id: "class-123",
        name: "Math 101",
        subject: "Mathematics",
        teacher_id: "teacher-123",
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            }),
          }),
        }),
      });

      const result = await createClass("Math 101", "Mathematics");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClassData);
      expect(revalidatePath).toHaveBeenCalledWith("/app/teacher/classes");
    });

    it("should create class without subject", async () => {
      mockVerifyTeacherAuth.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "class-123", name: "Class A", subject: null },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ insert: insertMock });

      const result = await createClass("Class A");

      expect(result.success).toBe(true);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Class A",
          subject: null,
        })
      );
    });

    it("should return error when database insert fails", async () => {
      mockVerifyTeacherAuth.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Duplicate class name" },
            }),
          }),
        }),
      });

      const result = await createClass("Math 101", "Mathematics");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Duplicate class name");
    });

    it("should handle unexpected errors", async () => {
      mockVerifyTeacherAuth.mockRejectedValue(new Error("Network error"));

      const result = await createClass("Math 101", "Mathematics");

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe("updateClass", () => {
    const validClassId = "550e8400-e29b-41d4-a716-446655440000";

    it("should return error for invalid class ID", async () => {
      const result = await updateClass("invalid-id", "New Name");

      expect(result.success).toBe(false);
    });

    it("should return error for empty name", async () => {
      const result = await updateClass(validClassId, "");

      expect(result.success).toBe(false);
    });

    it("should return error when not authorized (not class owner)", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Not authorized" },
      });

      const result = await updateClass(validClassId, "New Name");

      expect(result).toEqual({ success: false, error: "Not authorized" });
    });

    it("should return error when rate limited", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await updateClass(validClassId, "New Name");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should successfully update a class", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      const updatedClass = {
        id: validClassId,
        name: "Updated Math",
        subject: "Advanced Math",
      };

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedClass,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateClass(validClassId, "Updated Math", "Advanced Math");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedClass);
      expect(revalidatePath).toHaveBeenCalledWith("/app/teacher/classes");
    });

    it("should update class without subject (sets to null)", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: validClassId, name: "Class A", subject: null },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ update: updateMock });

      await updateClass(validClassId, "Class A");

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: null,
        })
      );
    });

    it("should return error when database update fails", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Update failed" },
              }),
            }),
          }),
        }),
      });

      const result = await updateClass(validClassId, "New Name");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("should handle unexpected errors", async () => {
      mockVerifyClassOwnership.mockRejectedValue(new Error("Network error"));

      const result = await updateClass(validClassId, "New Name");

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe("deleteClass", () => {
    const validClassId = "550e8400-e29b-41d4-a716-446655440000";

    it("should return error for invalid class ID", async () => {
      const result = await deleteClass("invalid-id");

      expect(result.success).toBe(false);
    });

    it("should return error when not authorized (not class owner)", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Not authorized" },
      });

      const result = await deleteClass(validClassId);

      expect(result).toEqual({ success: false, error: "Not authorized" });
    });

    it("should return error when rate limited", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await deleteClass(validClassId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should successfully delete a class", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await deleteClass(validClassId);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/app/teacher/classes");
    });

    it("should return error when database delete fails", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: { id: "teacher-123" },
      });

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: "Foreign key constraint" },
          }),
        }),
      });

      const result = await deleteClass(validClassId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Foreign key constraint");
    });

    it("should handle unexpected errors", async () => {
      mockVerifyClassOwnership.mockRejectedValue(new Error("Network error"));

      const result = await deleteClass(validClassId);

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalled();
    });
  });
});
