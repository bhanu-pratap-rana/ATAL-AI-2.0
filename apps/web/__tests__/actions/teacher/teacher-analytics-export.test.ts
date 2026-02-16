/**
 * Tests for teacher-analytics-export.ts server actions
 * Target: ~30 tests covering getClassAnalytics, exportStudentProgress, exportAIInteractions
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  verifyClassOwnership: jest.fn(),
  verifyTeacherAuth: jest.fn(),
}));

jest.mock("@/lib/constants/analytics", () => ({
  ANALYTICS_WINDOW_DAYS: 7,
  RAPID_RESPONSE_THRESHOLD_MS: 3000,
  AT_RISK_RAPID_PERCENTAGE: 0.5,
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

import {
  getClassAnalytics,
  exportStudentProgress,
  exportAIInteractions,
} from "@/app/actions/teacher/teacher-analytics-export";
import {
  createClient,
  verifyClassOwnership,
  verifyTeacherAuth,
} from "@/lib/supabase-server";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("teacher-analytics-export", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const teacherId = "660e8400-e29b-41d4-a716-446655440001";
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (verifyClassOwnership as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: teacherId, email: "teacher@test.com" },
    });
    (verifyTeacherAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: teacherId, email: "teacher@test.com" },
    });
  });

  describe("getClassAnalytics", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyClassOwnership as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authorized" },
        });

        const result = await getClassAnalytics(validUUID);

        expect(result).toEqual({ success: false, error: "Not authorized" });
      });

      it("should call verifyClassOwnership with correct params", async () => {
        // Mock successful class lookup
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { teacher_id: teacherId },
          error: null,
        });

        await getClassAnalytics(validUUID);

        expect(verifyClassOwnership).toHaveBeenCalledWith(
          "getClassAnalytics",
          validUUID
        );
      });

      it("should reject when class not owned by user", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { teacher_id: "different-teacher-id" },
          error: null,
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("You do not own this class");
      });
    });

    describe("Input Validation", () => {
      it("should reject invalid class ID format", async () => {
        const result = await getClassAnalytics("invalid-uuid");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject empty class ID", async () => {
        const result = await getClassAnalytics("");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Analytics Calculation", () => {
      beforeEach(() => {
        // Mock successful class ownership verification
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { teacher_id: teacherId },
          error: null,
        });
      });

      it("should call from with assessment_sessions table", async () => {
        // Setup mock to track calls
        const fromCalls: string[] = [];
        mockSupabase.from.mockImplementation((table: string) => {
          fromCalls.push(table);
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: [], error: null }),
            not: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { teacher_id: teacherId },
              error: null,
            }),
          };
          return builder;
        });

        await getClassAnalytics(validUUID);

        // Verify it queries the assessment_sessions table
        expect(fromCalls).toContain("assessment_sessions");
        expect(fromCalls).toContain("classes");
      });

      it("should query classes table for ownership verification", async () => {
        const fromCalls: string[] = [];
        mockSupabase.from.mockImplementation((table: string) => {
          fromCalls.push(table);
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: [], error: null }),
            not: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { teacher_id: teacherId },
              error: null,
            }),
          };
        });

        await getClassAnalytics(validUUID);

        expect(fromCalls.includes("classes")).toBe(true);
      });

      it("should handle class lookup error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("You do not own this class");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection failed");
      });
    });

    describe("Analytics Helpers Coverage", () => {
      // Helper to create a query chain builder that tracks method calls
      function _createQueryChainBuilder(config: {
        gteResult?: { data: unknown; error: unknown };
        notResult?: { data: unknown; error: unknown };
        orderResult?: { data: unknown; error: unknown };
      }) {
        let hasGte = false;
        let hasNot = false;

        const builder = {
          select: jest.fn(() => builder),
          eq: jest.fn(() => builder),
          gte: jest.fn(() => {
            hasGte = true;
            // If this is calculateActiveUsersThisWeek (gte without not)
            // Return the configured result immediately via thenable
            return {
              ...builder,
              then: (resolve: (val: unknown) => void) => {
                // Only resolve here if not() isn't called after
                setTimeout(() => {
                  if (!hasNot && config.gteResult) {
                    resolve(config.gteResult);
                  }
                }, 0);
              },
            };
          }),
          not: jest.fn(() => {
            hasNot = true;
            // For calculateAverageMinutesPerDay (has gte + not)
            if (hasGte && config.notResult) {
              return Promise.resolve(config.notResult);
            }
            // For calculateAtRiskCount (has not but no gte before)
            return builder;
          }),
          order: jest.fn(() => {
            // For calculateAtRiskCount (not + order)
            if (config.orderResult) {
              return Promise.resolve(config.orderResult);
            }
            return Promise.resolve({ data: [], error: null });
          }),
        };
        return builder;
      }

      it("should return error when active sessions query fails", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "assessment_sessions") {
            // All three parallel calls will hit this
            // calculateActiveUsersThisWeek uses .gte() that resolves
            // calculateAverageMinutesPerDay uses .gte().not() where .not() resolves
            // calculateAtRiskCount uses .not().order() where .order() resolves
            const builder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              // gte returns error for calculateActiveUsersThisWeek, but also provides .not() for calculateAverageMinutesPerDay
              gte: jest.fn().mockReturnValue({
                // For calculateActiveUsersThisWeek: returns error when awaited
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: null, error: { message: "Active sessions query failed" } });
                },
                catch: () => {},
                // For calculateAverageMinutesPerDay: allows chaining to .not()
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              // For calculateAtRiskCount: .not().order() chain
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
            return builder;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch active sessions");
      });

      it("should return error when user sessions query fails", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "assessment_sessions") {
            const builder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              // calculateActiveUsersThisWeek succeeds
              gte: jest.fn().mockReturnValue({
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: [], error: null });
                },
                // For calculateAverageMinutesPerDay chain
                not: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "User sessions query failed" },
                }),
              }),
              // For calculateAtRiskCount (no gte, uses not directly)
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
            return builder;
          }
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch user sessions");
      });

      it("should return error when recent sessions query fails", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "assessment_sessions") {
            const builder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              // calculateActiveUsersThisWeek succeeds
              gte: jest.fn().mockReturnValue({
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: [], error: null });
                },
                // For calculateAverageMinutesPerDay chain
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              // For calculateAtRiskCount - this chain fails
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Recent sessions query failed" },
                }),
              }),
            };
            return builder;
          }
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch recent sessions");
      });

      it("should calculate average minutes per day from response times", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "assessment_sessions") {
            const builder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnValue({
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: [{ user_id: "student-1" }], error: null });
                },
                not: jest.fn().mockResolvedValue({
                  data: [{ id: "session-1", user_id: "student-1", started_at: "2024-01-15" }],
                  error: null,
                }),
              }),
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ id: "session-1", user_id: "student-1" }],
                  error: null,
                }),
              }),
            };
            return builder;
          }
          if (table === "assessment_responses") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({
                data: [
                  { session_id: "session-1", rt_ms: 60000 }, // 1 minute
                  { session_id: "session-1", rt_ms: 30000 }, // 30 seconds
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should detect at-risk students with rapid responses", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "assessment_sessions") {
            const builder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnValue({
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: [{ user_id: "student-1" }], error: null });
                },
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ id: "session-1", user_id: "student-1" }],
                  error: null,
                }),
              }),
            };
            return builder;
          }
          if (table === "assessment_responses") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({
                data: [
                  // All responses under 3000ms threshold - marks student at-risk
                  { session_id: "session-1", rt_ms: 1000 },
                  { session_id: "session-1", rt_ms: 1500 },
                  { session_id: "session-1", rt_ms: 2000 },
                  { session_id: "session-1", rt_ms: 2500 },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(true);
        expect(result.data?.atRiskCount).toBe(1);
      });

      it("should return error when assessment responses query fails for at-risk", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "assessment_sessions") {
            const builder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnValue({
                then: (resolve: (val: unknown) => void) => {
                  resolve({ data: [], error: null });
                },
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ id: "session-1", user_id: "student-1" }],
                  error: null,
                }),
              }),
            };
            return builder;
          }
          if (table === "assessment_responses") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Response query failed" },
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await getClassAnalytics(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch session responses for at-risk analysis");
      });
    });
  });

  describe("exportStudentProgress", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyTeacherAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await exportStudentProgress(validUUID);

        expect(result).toEqual({ success: false, error: "Not authenticated" });
      });

      it("should reject when class not found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Class not found");
      });

      it("should reject when not class owner", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { teacher_id: "different-teacher" },
          error: null,
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unauthorized");
      });
    });

    describe("Data Export", () => {
      beforeEach(() => {
        // Setup: first call returns class data, subsequent calls return student data
        mockSupabase.from.mockImplementation(() => {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { teacher_id: teacherId },
              error: null,
            }),
          };
        });
      });

      it("should return student progress data", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: "John Doe" } },
                    student_knowledge_state: {
                      topics_mastered: 5,
                      total_topics: 10,
                      average_mastery: 75,
                      last_attempt_at: "2024-01-15T00:00:00Z",
                    },
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should handle student fetch error", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Failed to fetch" },
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch student data");
      });
    });

    describe("CSV Sanitization", () => {
      it("should sanitize formula injection in names starting with =", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: "=cmd|' /C calc'!A0" } },
                    student_knowledge_state: {
                      topics_mastered: 5,
                      total_topics: 10,
                      average_mastery: 75,
                      last_attempt_at: null,
                    },
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        // Name should be prefixed with quote to prevent formula injection
        expect(result.data[0].name).toMatch(/^'/);
      });

      it("should sanitize formula injection in names starting with +", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: "+1234567890" } },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toMatch(/^'/);
      });

      it("should sanitize formula injection in names starting with @", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: "@SUM(A1:A10)" } },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toMatch(/^'/);
      });

      it("should handle non-string name values", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: { nested: "object" } } },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toBe("Unknown");
      });

      it("should handle null/undefined names gracefully", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: {} },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toBe("Unknown");
      });

      it("should handle numeric name values", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: 12345 } },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toBe("12345");
      });

      it("should sanitize hidden formula injection (whitespace + formula)", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: "  =SUM(A1:A10)" } },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        // Should be prefixed with quote to prevent hidden formula injection
        expect(result.data[0].name).toMatch(/^'/);
      });

      it("should handle array student data from Supabase join", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    // Student as array (Supabase join result)
                    student: [{ id: "student-1", raw_user_meta_data: { full_name: "Array Student" } }],
                    student_knowledge_state: [{
                      topics_mastered: 5,
                      total_topics: 10,
                      average_mastery: 75,
                      last_attempt_at: "2024-01-15T00:00:00Z",
                    }],
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toBe("Array Student");
        expect(result.data[0].progress_percentage).toBe(50);
      });

      it("should escape double quotes in names for CSV safety", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    student_id: "student-1",
                    student: { id: "student-1", raw_user_meta_data: { full_name: 'John "The Great" Doe' } },
                    student_knowledge_state: null,
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(true);
        expect(result.data[0].name).toContain('""'); // Escaped double quotes
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Network error"));

        const result = await exportStudentProgress(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Network error");
      });
    });
  });

  describe("exportAIInteractions", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyTeacherAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await exportAIInteractions(validUUID);

        expect(result).toEqual({ success: false, error: "Not authenticated" });
      });

      it("should reject when class not found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Class not found");
      });

      it("should reject when not class owner", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { teacher_id: "different-teacher" },
          error: null,
        });

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unauthorized");
      });
    });

    describe("Data Export", () => {
      it("should return empty array when no enrolled students", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it("should return AI interactions for enrolled students", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [{ student_id: "student-1" }],
                error: null,
              }),
            };
          }
          if (table === "ai_tutor_interactions") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "interaction-1",
                    student_id: "student-1",
                    topic_id: "topic-1",
                    message_content: "Hello",
                    message_role: "user",
                    language: "en",
                    input_mode: "text",
                    tokens_used: 10,
                    created_at: "2024-01-15T00:00:00Z",
                    student: { raw_user_meta_data: { full_name: "John Doe" } },
                  },
                ],
                error: null,
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data[0]).toHaveProperty("student_name");
        expect(result.data[0]).toHaveProperty("topic_id");
        expect(result.data[0]).toHaveProperty("message");
        expect(result.data[0]).toHaveProperty("role");
      });

      it("should handle enrollment fetch error", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Failed" },
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch enrollments");
      });

      it("should handle interaction fetch error", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [{ student_id: "student-1" }],
                error: null,
              }),
            };
          }
          if (table === "ai_tutor_interactions") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Failed" },
              }),
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to fetch interactions");
      });

      it("should respect limit parameter", async () => {
        const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [{ student_id: "student-1" }],
                error: null,
              }),
            };
          }
          if (table === "ai_tutor_interactions") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: mockLimit,
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        await exportAIInteractions(validUUID, 100);

        expect(mockLimit).toHaveBeenCalledWith(100);
      });

      it("should use default limit of 500", async () => {
        const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "classes") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { teacher_id: teacherId },
                error: null,
              }),
            };
          }
          if (table === "enrollments") {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [{ student_id: "student-1" }],
                error: null,
              }),
            };
          }
          if (table === "ai_tutor_interactions") {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: mockLimit,
            };
          }
          return mockSupabase._mockQueryBuilder;
        });

        await exportAIInteractions(validUUID);

        expect(mockLimit).toHaveBeenCalledWith(500);
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection error"));

        const result = await exportAIInteractions(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection error");
      });
    });
  });
});
