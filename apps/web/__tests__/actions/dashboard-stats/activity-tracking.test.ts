/**
 * Tests for activity-tracking.ts
 * Target: ~15 tests covering activity tracking and aggregation
 */

import { getRecentActivity } from "@/app/actions/dashboard-stats/activity-tracking";

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("activity-tracking", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock supabase client
    mockSupabase = {
      from: jest.fn(),
    };
  });

  describe("getRecentActivity", () => {
    it("should return empty array when no sessions exist", async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result).toEqual([]);
    });

    it("should return assessment activities for students", async () => {
      // Mock sessions query
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: "session-1", started_at: "2024-01-01", submitted_at: "2024-01-02" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      // Mock responses query
      const mockResponsesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [
              { session_id: "session-1", is_correct: true },
              { session_id: "session-1", is_correct: true },
              { session_id: "session-1", is_correct: false },
            ],
            error: null,
          }),
        }),
      };

      // Mock enrollments query
      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") {
          return mockSessionsQuery;
        }
        if (table === "assessment_responses") {
          return mockResponsesQuery;
        }
        if (table === "enrollments") {
          return mockEnrollmentsQuery;
        }
        return mockSessionsQuery;
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("assessment");
    });

    it("should calculate score correctly in activity description", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: "session-1", started_at: "2024-01-01", submitted_at: "2024-01-02" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const mockResponsesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [
              { session_id: "session-1", is_correct: true },
              { session_id: "session-1", is_correct: true },
              { session_id: "session-1", is_correct: true },
              { session_id: "session-1", is_correct: true }, // 4/5 = 80%
              { session_id: "session-1", is_correct: false },
            ],
            error: null,
          }),
        }),
      };

      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        if (table === "assessment_responses") return mockResponsesQuery;
        if (table === "enrollments") return mockEnrollmentsQuery;
        return mockSessionsQuery;
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result[0].score).toBe(80);
      expect(result[0].description).toContain("80%");
    });

    it("should skip class join activities for teachers", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        // Enrollments should not be queried for teachers
        throw new Error("Enrollments should not be queried for teachers");
      });

      const result = await getRecentActivity(mockSupabase, "teacher-123", true);

      expect(result).toEqual([]);
    });

    it("should include class join activities for students", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };

      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "enroll-1",
                    enrolled_at: "2024-01-01",
                    classes: { name: "Math 101" },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        if (table === "enrollments") return mockEnrollmentsQuery;
        return mockSessionsQuery;
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe("class_join");
      expect(result[0].description).toBe("Math 101");
    });

    it("should handle sessions query error", async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "DB error" },
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result).toEqual([]);
    });

    it("should handle responses query error gracefully", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: "session-1", started_at: "2024-01-01", submitted_at: "2024-01-02" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const mockResponsesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Responses error" },
          }),
        }),
      };

      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        if (table === "assessment_responses") return mockResponsesQuery;
        if (table === "enrollments") return mockEnrollmentsQuery;
        return mockSessionsQuery;
      });

      // Should still return activities but with 0 score
      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].score).toBe(0);
    });

    it("should sort activities by timestamp descending", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: "session-1", started_at: "2024-01-01", submitted_at: "2024-01-01" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const mockResponsesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };

      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  { id: "enroll-1", enrolled_at: "2024-02-01", classes: { name: "Class" } },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        if (table === "assessment_responses") return mockResponsesQuery;
        if (table === "enrollments") return mockEnrollmentsQuery;
        return mockSessionsQuery;
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result.length).toBe(2);
      // Feb should come before Jan (descending order)
      expect(new Date(result[0].timestamp).getTime()).toBeGreaterThan(
        new Date(result[1].timestamp).getTime()
      );
    });

    it("should limit results to 5 activities", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: "s1", started_at: "2024-01-01", submitted_at: "2024-01-01" },
                    { id: "s2", started_at: "2024-01-02", submitted_at: "2024-01-02" },
                    { id: "s3", started_at: "2024-01-03", submitted_at: "2024-01-03" },
                    { id: "s4", started_at: "2024-01-04", submitted_at: "2024-01-04" },
                    { id: "s5", started_at: "2024-01-05", submitted_at: "2024-01-05" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const mockResponsesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [
              { session_id: "s1", is_correct: true },
              { session_id: "s2", is_correct: true },
              { session_id: "s3", is_correct: true },
              { session_id: "s4", is_correct: true },
              { session_id: "s5", is_correct: true },
            ],
            error: null,
          }),
        }),
      };

      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  { id: "e1", enrolled_at: "2024-01-06", classes: { name: "C1" } },
                  { id: "e2", enrolled_at: "2024-01-07", classes: { name: "C2" } },
                  { id: "e3", enrolled_at: "2024-01-08", classes: { name: "C3" } },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        if (table === "assessment_responses") return mockResponsesQuery;
        if (table === "enrollments") return mockEnrollmentsQuery;
        return mockSessionsQuery;
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should handle missing class name gracefully", async () => {
      const mockSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };

      const mockEnrollmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  { id: "enroll-1", enrolled_at: "2024-01-01", classes: null },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "assessment_sessions") return mockSessionsQuery;
        if (table === "enrollments") return mockEnrollmentsQuery;
        return mockSessionsQuery;
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result.length).toBe(1);
      expect(result[0].description).toBe("Unknown Class");
    });

    it("should handle unexpected errors", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Unexpected");
      });

      const result = await getRecentActivity(mockSupabase, "user-123", false);

      expect(result).toEqual([]);
    });
  });
});
