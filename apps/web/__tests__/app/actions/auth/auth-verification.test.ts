/**
 * Tests for app/actions/auth/auth-verification.ts
 * Authentication verification and role management
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/admin-utils", () => ({
  findAuthUserByEmail: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import {
  checkEmailExistsInAuth,
  signOutUser,
} from "@/app/actions/auth/auth-verification";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { findAuthUserByEmail } from "@/lib/admin-utils";
import { revalidatePath } from "next/cache";
import { authLogger } from "@/lib/auth-logger";

const mockCreateClient = createClient as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;
const mockFindAuthUserByEmail = findAuthUserByEmail as jest.Mock;

describe("auth-verification actions", () => {
  let mockSupabaseClient: {
    from: jest.Mock;
    auth: {
      signOut: jest.Mock;
    };
  };

  let mockAdminClient: {
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      from: jest.fn(),
      auth: {
        signOut: jest.fn(),
      },
    };

    mockAdminClient = {
      from: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabaseClient);
    mockCreateAdminClient.mockResolvedValue(mockAdminClient);
  });

  describe("checkEmailExistsInAuth", () => {
    it("should return exists false for non-existent user", async () => {
      mockFindAuthUserByEmail.mockResolvedValue(null);

      const result = await checkEmailExistsInAuth("new@example.com");

      expect(result.exists).toBe(false);
      expect(result.role).toBeUndefined();
    });

    it("should return exists true with student role", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: {},
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "student_profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: "user-123" },
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      });

      const result = await checkEmailExistsInAuth("student@example.com");

      expect(result.exists).toBe(true);
      expect(result.role).toBe("student");
      expect(result.hasStudentProfile).toBe(true);
      expect(result.hasTeacherProfile).toBe(false);
    });

    it("should return exists true with teacher role", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "teacher_profiles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: "user-123" },
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      });

      const result = await checkEmailExistsInAuth("teacher@example.com");

      expect(result.exists).toBe(true);
      expect(result.role).toBe("teacher");
      expect(result.hasTeacherProfile).toBe(true);
    });

    it("should return admin role from app_metadata", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "admin" },
      });

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const result = await checkEmailExistsInAuth("admin@example.com");

      expect(result.exists).toBe(true);
      expect(result.role).toBe("admin");
    });

    it("should return super_admin role from app_metadata", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "super_admin" },
      });

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const result = await checkEmailExistsInAuth("superadmin@example.com");

      expect(result.exists).toBe(true);
      expect(result.role).toBe("super_admin");
    });

    it("should return unknown role when no profile and no app_metadata role", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: {},
      });

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const result = await checkEmailExistsInAuth("unknown@example.com");

      expect(result.exists).toBe(true);
      expect(result.role).toBe("unknown");
    });

    it("should return exists false for invalid email", async () => {
      const result = await checkEmailExistsInAuth("invalid-email");

      expect(result.exists).toBe(false);
    });

    it("should handle unexpected errors", async () => {
      mockFindAuthUserByEmail.mockRejectedValue(new Error("Network error"));

      const result = await checkEmailExistsInAuth("test@example.com");

      expect(result.exists).toBe(false);
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should log info when email exists", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });

      mockAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      await checkEmailExistsInAuth("test@example.com");

      expect(authLogger.info).toHaveBeenCalledWith(
        "[checkEmailExistsInAuth] Email exists",
        expect.any(Object)
      );
    });
  });

  describe("checkUserIsTeacher", () => {
    beforeEach(() => {
      // Reset the module to handle dynamic import
      jest.resetModules();
    });

    it("should return isTeacher false when not authenticated", async () => {
      jest.doMock("@/lib/supabase-server", () => ({
        createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
        getCurrentUser: jest.fn().mockResolvedValue(null),
      }));

      // Re-import to get fresh module with mock
      const { checkUserIsTeacher: check } = await import(
        "@/app/actions/auth/auth-verification"
      );
      const result = await check();

      expect(result.isTeacher).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return isTeacher true when user has teacher profile", async () => {
      jest.doMock("@/lib/supabase-server", () => ({
        createClient: jest.fn().mockResolvedValue({
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: "user-123" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        getCurrentUser: jest.fn().mockResolvedValue({ id: "user-123" }),
      }));

      const { checkUserIsTeacher: check } = await import(
        "@/app/actions/auth/auth-verification"
      );
      const result = await check();

      expect(result.isTeacher).toBe(true);
      expect(result.userId).toBe("user-123");
    });

    it("should return isTeacher false when user has no teacher profile", async () => {
      jest.doMock("@/lib/supabase-server", () => ({
        createClient: jest.fn().mockResolvedValue({
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        getCurrentUser: jest.fn().mockResolvedValue({ id: "user-123" }),
      }));

      const { checkUserIsTeacher: check } = await import(
        "@/app/actions/auth/auth-verification"
      );
      const result = await check();

      expect(result.isTeacher).toBe(false);
      expect(result.userId).toBe("user-123");
    });

    it("should return error when database query fails", async () => {
      jest.doMock("@/lib/supabase-server", () => ({
        createClient: jest.fn().mockResolvedValue({
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "DB error" },
                }),
              }),
            }),
          }),
        }),
        getCurrentUser: jest.fn().mockResolvedValue({ id: "user-123" }),
      }));

      const { checkUserIsTeacher: check } = await import(
        "@/app/actions/auth/auth-verification"
      );
      const result = await check();

      expect(result.isTeacher).toBe(false);
      expect(result.error).toBe("Failed to check teacher status");
    });
  });

  describe("signOutUser", () => {
    it("should successfully sign out user", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await signOutUser();

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("should return error when sign out fails", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: "Sign out failed" },
      });

      const result = await signOutUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sign out failed");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error("Network error")
      );

      const result = await signOutUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to sign out");
      expect(authLogger.error).toHaveBeenCalled();
    });
  });
});
