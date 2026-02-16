/**
 * Tests for auth-username.ts server actions
 * Target: ~25 tests covering checkUsernameAvailable, registerWithUsername, signInWithUsername
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkOtpRateLimit: jest.fn(() => true),
  checkEnumerationRateLimit: jest.fn(() => true),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
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

// Mock node:crypto
jest.mock("node:crypto", () => ({
  randomBytes: jest.fn(() => ({
    toString: () => "abcd1234",
  })),
}));

import {
  checkUsernameAvailable,
  registerWithUsername,
  signInWithUsername,
} from "@/app/actions/auth/auth-username";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import {
  checkOtpRateLimit,
  checkEnumerationRateLimit,
} from "@/lib/rate-limiter-distributed";
import { revalidatePath } from "next/cache";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
        getUserById: jest.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@student.atal.internal" } },
          error: null,
        }),
      },
    },
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("auth-username", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAdminClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockAdminClient = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as jest.Mock).mockResolvedValue(mockAdminClient);
    (checkOtpRateLimit as jest.Mock).mockResolvedValue(true);
    (checkEnumerationRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("checkUsernameAvailable", () => {
    describe("Rate Limiting", () => {
      it("should reject when enumeration rate limit exceeded", async () => {
        (checkEnumerationRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await checkUsernameAvailable("testuser");

        expect(result.available).toBe(false);
        expect(result.error).toContain("Too many username checks");
      });
    });

    describe("Validation", () => {
      it("should reject invalid username format", async () => {
        const result = await checkUsernameAvailable("ab"); // Too short

        expect(result.available).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject username with special characters", async () => {
        const result = await checkUsernameAvailable("user@name!");

        expect(result.available).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Availability Check", () => {
      it("should return available true when username not taken", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await checkUsernameAvailable("newuser123");

        expect(result.available).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should return available false when username taken", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { username: "existinguser" },
          error: null,
        });

        const result = await checkUsernameAvailable("existinguser");

        expect(result.available).toBe(false);
      });

      it("should handle database error", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await checkUsernameAvailable("testuser");

        expect(result.available).toBe(false);
        expect(result.error).toBe("Failed to check username availability");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createAdminClient as jest.Mock).mockRejectedValue(
          new Error("Connection failed")
        );

        const result = await checkUsernameAvailable("testuser");

        expect(result.available).toBe(false);
        expect(result.error).toBe("An unexpected error occurred");
      });
    });
  });

  describe("registerWithUsername", () => {
    describe("Validation", () => {
      it("should reject invalid username", async () => {
        const result = await registerWithUsername("ab", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject weak password", async () => {
        const result = await registerWithUsername("validuser", "short");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkOtpRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await registerWithUsername("testuser", "Password123!");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many registration attempts");
      });
    });

    describe("Username Uniqueness", () => {
      it("should reject already taken username", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { username: "testuser" },
          error: null,
        });

        const result = await registerWithUsername("testuser", "Password123!");

        expect(result.success).toBe(false);
        expect(result.error).toContain("already taken");
      });
    });

    describe("User Creation", () => {
      it("should create user successfully", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });
        mockAdminClient._mockQueryBuilder.insert.mockReturnValue({
          error: null,
        });

        const result = await registerWithUsername("newuser123", "Password123!");

        expect(result.success).toBe(true);
        expect(result.userId).toBe("user-123");
      });

      it("should handle auth creation error", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });
        mockAdminClient.auth.admin.createUser.mockResolvedValue({
          data: { user: null },
          error: { message: "Auth error" },
        });

        const result = await registerWithUsername("newuser123", "Password123!");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to create account");
      });

      it("should rollback on username insert error", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });
        mockAdminClient._mockQueryBuilder.insert.mockReturnValue({
          error: { message: "Insert error" },
        });

        const result = await registerWithUsername("newuser123", "Password123!");

        expect(result.success).toBe(false);
        expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
          "user-123"
        );
      });

      it("should rollback on profile creation error", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });
        mockAdminClient._mockQueryBuilder.insert.mockReturnValue({
          error: null,
        });
        mockAdminClient.rpc.mockResolvedValue({
          data: null,
          error: { message: "RPC error" },
        });

        const result = await registerWithUsername("newuser123", "Password123!");

        expect(result.success).toBe(false);
        expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createAdminClient as jest.Mock).mockRejectedValue(
          new Error("Connection failed")
        );

        const result = await registerWithUsername("testuser", "Password123!");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection failed");
      });
    });
  });

  describe("signInWithUsername", () => {
    describe("Validation", () => {
      it("should reject invalid username format", async () => {
        const result = await signInWithUsername("ab", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid username or password");
      });

      it("should reject empty password", async () => {
        const result = await signInWithUsername("validuser", "");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Password is required");
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkOtpRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many login attempts");
      });
    });

    describe("Username Lookup", () => {
      it("should return error when username not found", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await signInWithUsername("unknownuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid username or password");
      });

      it("should handle lookup error", async () => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Login failed. Please try again.");
      });
    });

    describe("Authentication", () => {
      beforeEach(() => {
        mockAdminClient._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { user_id: "user-123" },
          error: null,
        });
      });

      it("should sign in successfully", async () => {
        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(true);
        expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
      });

      it("should handle invalid password", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: null },
          error: { message: "Invalid password" },
        });

        const result = await signInWithUsername("testuser", "wrongpassword");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid username or password");
      });

      it("should reject teacher accounts", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "user-123", app_metadata: { role: "teacher" } } },
          error: null,
        });

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("This account cannot use username login");
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });

      it("should reject admin accounts", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "user-123", app_metadata: { role: "admin" } } },
          error: null,
        });

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("This account cannot use username login");
      });

      it("should reject super_admin accounts", async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: "user-123", app_metadata: { role: "super_admin" } },
          },
          error: null,
        });

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("This account cannot use username login");
      });

      it("should handle getUserById error", async () => {
        mockAdminClient.auth.admin.getUserById.mockResolvedValue({
          data: { user: null },
          error: { message: "User not found" },
        });

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Login failed. Please try again.");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createAdminClient as jest.Mock).mockRejectedValue(
          new Error("Connection failed")
        );

        const result = await signInWithUsername("testuser", "password123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection failed");
      });
    });
  });
});
