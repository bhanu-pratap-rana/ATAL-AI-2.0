/**
 * Tests for Teacher Enrollment Actions
 * Tests student enrollment and removal from classes
 */

import { enrollStudent, removeStudent } from "@/app/actions/teacher/teacher-enrollment";

// Mock revalidatePath
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock action error handler
jest.mock("@/lib/action-error-handler", () => ({
  handleZodError: jest.fn().mockReturnValue({
    success: false,
    error: "Validation error",
  }),
}));

// Mock rate limiter
const mockCheckTeacherMutationRateLimit = jest.fn();
jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkTeacherMutationRateLimit: (...args: unknown[]) =>
    mockCheckTeacherMutationRateLimit(...args),
}));

// Mock supabase-server
const mockVerifyClassOwnership = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockDelete = jest.fn();
const mockDeleteEq = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createClient: () =>
    Promise.resolve({
      from: mockFrom,
    }),
  verifyClassOwnership: (...args: unknown[]) => mockVerifyClassOwnership(...args),
}));

// Helper to create final eq mock that returns the actual result
const mockFinalDeleteEq = jest.fn();

describe("Teacher Enrollment Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckTeacherMutationRateLimit.mockResolvedValue(true);
    mockVerifyClassOwnership.mockResolvedValue({
      authorized: true,
      user: { id: "teacher-123" },
    });

    // Chain mock methods for insert
    mockFrom.mockReturnValue({
      insert: mockInsert,
      delete: mockDelete,
    });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });

    // Chain mock methods for delete - creates proper chain: delete().eq().eq()
    // First eq returns an object with another eq function
    // Second eq is the one that returns the promise with error
    mockDelete.mockReturnValue({ eq: mockDeleteEq });
    mockDeleteEq.mockReturnValue({ eq: mockFinalDeleteEq });
    mockFinalDeleteEq.mockResolvedValue({ error: null });
  });

  describe("enrollStudent", () => {
    const validClassId = "00000000-0000-0000-0000-000000000001";
    const validStudentId = "00000000-0000-0000-0000-000000000002";

    it("should successfully enroll a student", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "enrollment-123",
          class_id: validClassId,
          student_id: validStudentId,
        },
        error: null,
      });

      const result = await enrollStudent(validClassId, validStudentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockFrom).toHaveBeenCalledWith("enrollments");
    });

    it("should return error for invalid class ID", async () => {
      const result = await enrollStudent("invalid-uuid", validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error for invalid student ID", async () => {
      const result = await enrollStudent(validClassId, "invalid-uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error when not authorized", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Unauthorized" },
      });

      const result = await enrollStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when rate limited", async () => {
      mockCheckTeacherMutationRateLimit.mockResolvedValue(false);

      const result = await enrollStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return error when student already enrolled", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Duplicate key" },
      });

      const result = await enrollStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already enrolled");
    });

    it("should return error on database error", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "Database error" },
      });

      const result = await enrollStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should handle unexpected errors gracefully", async () => {
      // Reset the chain to trigger an error in a different way
      mockFrom.mockImplementationOnce(() => {
        throw new Error("Network failure");
      });

      const result = await enrollStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network failure");
    });
  });

  describe("removeStudent", () => {
    const validClassId = "00000000-0000-0000-0000-000000000001";
    const validStudentId = "00000000-0000-0000-0000-000000000002";

    it("should successfully remove a student", async () => {
      mockFinalDeleteEq.mockResolvedValue({ error: null });

      const result = await removeStudent(validClassId, validStudentId);

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("enrollments");
    });

    it("should return error for invalid class ID", async () => {
      const result = await removeStudent("invalid-uuid", validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error for invalid student ID", async () => {
      const result = await removeStudent(validClassId, "invalid-uuid");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error when not authorized", async () => {
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Unauthorized" },
      });

      const result = await removeStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should return error when rate limited", async () => {
      mockCheckTeacherMutationRateLimit.mockResolvedValue(false);

      const result = await removeStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return error on database error", async () => {
      mockFinalDeleteEq.mockResolvedValue({
        error: { message: "Database error" },
      });

      const result = await removeStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should handle unexpected errors gracefully", async () => {
      // Reset the chain to trigger an error in a different way
      mockFrom.mockImplementationOnce(() => {
        throw new Error("Network failure");
      });

      const result = await removeStudent(validClassId, validStudentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network failure");
    });
  });
});
