/**
 * Tests for search-students API route
 * Target: ~30 tests covering authentication, authorization, rate limiting, and search
 */

// Polyfill Request/Response for Next.js server testing
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock next/server before importing route
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

// Mock dependencies
const mockGetCurrentUser = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createClient: () => mockCreateClient(),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    studentSearch: { tokensPerInterval: 30, interval: 60000 },
  },
}));

const mockIsTeacherOrHigher = jest.fn();
jest.mock("@/lib/auth/role-utils", () => ({
  isTeacherOrHigher: (role: string) => mockIsTeacherOrHigher(role),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { POST } from "@/app/api/teacher/search-students/route";

// Helper to create mock request
function createMockRequest(body: object): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

describe("POST /api/teacher/search-students", () => {
  const mockSupabaseClient = {
    from: jest.fn(),
    rpc: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabaseClient);
    mockCheckRateLimit.mockResolvedValue(true);
    mockIsTeacherOrHigher.mockReturnValue(false);
  });

  describe("authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("authorization", () => {
    it("should allow access for teacher role", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest({ query: "john" });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should allow access for admin role", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "admin" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest({ query: "john" });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should check teacher_profiles if role check fails", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "student" },
      });
      mockIsTeacherOrHigher.mockReturnValue(false);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: "user-123" },
              error: null,
            }),
          }),
        }),
      });
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("teacher_profiles");
    });

    it("should return 403 when user is not a teacher", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "student" },
      });
      mockIsTeacherOrHigher.mockReturnValue(false);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only teachers and administrators can search for students");
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limit exceeded", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
      mockCheckRateLimit.mockResolvedValue(false);

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("Too many search requests");
    });

    it("should call checkRateLimit with user-specific key", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-456",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest({ query: "test" });
      await POST(request);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "search-students:user-456",
        expect.any(Object)
      );
    });
  });

  describe("query validation", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
    });

    it("should return 400 for missing query", async () => {
      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid query parameter");
    });

    it("should return 400 for null query", async () => {
      const request = createMockRequest({ query: null });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid query parameter");
    });

    it("should return 400 for empty query", async () => {
      const request = createMockRequest({ query: "   " });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Query is required and must not be empty");
    });

    it("should truncate query to 50 characters", async () => {
      const longQuery = "a".repeat(100);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest({ query: longQuery });
      await POST(request);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "search_students_for_teacher",
        expect.objectContaining({
          p_search_query: "a".repeat(50),
        })
      );
    });
  });

  describe("RPC search", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
    });

    it("should call RPC with correct parameters", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = createMockRequest({ query: "john" });
      await POST(request);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "search_students_for_teacher",
        {
          p_search_query: "john",
          p_limit: 10,
        }
      );
    });

    it("should return formatted students on success", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          {
            user_id: "student-1",
            name: "John Doe",
            roll_number: "R001",
            phone: "+1234567890",
            class_name: "Class A",
          },
          {
            user_id: "student-2",
            name: null,
            roll_number: null,
            phone: null,
            class_name: null,
          },
        ],
        error: null,
      });

      const request = createMockRequest({ query: "john" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toHaveLength(2);
      expect(data.students[0]).toEqual({
        id: "student-1",
        name: "John Doe",
        rollNumber: "R001",
        phone: "+1234567890",
      });
      expect(data.students[1]).toEqual({
        id: "student-2",
        name: "Unknown",
        rollNumber: null,
        phone: null,
      });
    });

    it("should handle empty results", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockRequest({ query: "nonexistent" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toEqual([]);
    });
  });

  describe("fallback search", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
    });

    it("should use fallback when RPC fails", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC not found" },
      });

      // Mock fallback queries
      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [{ id: "class-1" }],
            error: null,
          }),
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const request = createMockRequest({ query: "test" });
      await POST(request);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("classes");
    });

    it("should return empty array when teacher has no classes", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC not found" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should return 500 on unexpected error", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should return 500 when fetching teacher classes fails", async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsTeacherOrHigher.mockReturnValue(true);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const request = createMockRequest({ query: "test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to search students");
    });
  });
});
