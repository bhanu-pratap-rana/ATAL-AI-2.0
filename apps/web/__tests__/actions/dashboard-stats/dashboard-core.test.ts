/**
 * Tests for dashboard-core.ts
 * Target: ~25 tests covering getDashboardStats and getProgressStats
 */

import { getDashboardStats, getProgressStats } from "@/app/actions/dashboard-stats/dashboard-core";

// Mock dependencies
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockNot = jest.fn();
const mockOrder = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn().mockImplementation(async () => ({
    from: jest.fn().mockReturnValue({
      select: mockSelect,
    }),
  })),
  getCurrentUser: jest.fn().mockResolvedValue({
    id: "user-123",
    email: "user@test.com",
    app_metadata: { role: "student" },
  }),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock the helper modules
jest.mock("@/app/actions/dashboard-stats/progress-analytics", () => ({
  calculateScoreAndTime: jest.fn().mockReturnValue({
    averageScore: 75,
    totalTimeSpent: 120,
  }),
  calculateModuleBreakdown: jest.fn().mockReturnValue([
    { module: "Math", correct: 8, total: 10 },
  ]),
  buildResponsesBySessionMap: jest.fn().mockReturnValue(new Map()),
  calculateRecentAssessments: jest.fn().mockReturnValue([
    { id: "1", score: 80, date: "2024-01-01" },
  ]),
  calculateStreak: jest.fn().mockResolvedValue(5),
}));

jest.mock("@/app/actions/dashboard-stats/activity-tracking", () => ({
  getRecentActivity: jest.fn().mockResolvedValue([
    {
      id: "1",
      type: "assessment",
      title: "Assessment",
      description: "Completed",
      timestamp: "2024-01-01",
    },
  ]),
}));

import { getCurrentUser } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { calculateStreak } from "@/app/actions/dashboard-stats/progress-analytics";
import { getRecentActivity } from "@/app/actions/dashboard-stats/activity-tracking";

describe("dashboard-core actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockNot.mockReturnThis();
    mockOrder.mockReturnThis();

    mockSelect.mockReturnValue({
      eq: mockEq,
      not: mockNot,
      order: mockOrder,
    });

    // Default count response
    mockEq.mockReturnValue({
      eq: mockEq,
      not: mockNot,
      count: 5,
      data: null,
      error: null,
    });

    mockNot.mockResolvedValue({
      count: 3,
      data: null,
      error: null,
    });

    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "user@test.com",
      app_metadata: { role: "student" },
    });

    (checkRateLimit as jest.Mock).mockResolvedValue(true);
    (calculateStreak as jest.Mock).mockResolvedValue(5);
    (getRecentActivity as jest.Mock).mockResolvedValue([]);
  });

  describe("getDashboardStats", () => {
    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

        const result = await getDashboardStats();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });

      it("should succeed for authenticated student", async () => {
        const result = await getDashboardStats();

        expect(result.success).toBe(true);
      });

      it("should succeed for authenticated teacher", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({
          id: "teacher-123",
          app_metadata: { role: "teacher" },
        });

        const result = await getDashboardStats();

        expect(result.success).toBe(true);
      });

      it("should reject unauthorized roles", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({
          id: "user-123",
          app_metadata: { role: "unauthorized_role" },
        });

        const result = await getDashboardStats();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unauthorized");
      });
    });

    describe("rate limiting", () => {
      it("should return error when rate limited", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValueOnce(false);

        const result = await getDashboardStats();

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });
    });

    describe("data retrieval", () => {
      it("should fetch classes count for students", async () => {
        const result = await getDashboardStats();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should fetch classes count for teachers", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({
          id: "teacher-123",
          app_metadata: { role: "teacher" },
        });

        const result = await getDashboardStats();

        expect(result.success).toBe(true);
      });

      it("should include assessments count in response", async () => {
        const result = await getDashboardStats();

        expect(result.success).toBe(true);
        expect(result.data?.assessmentsCount).toBeDefined();
      });

      it("should calculate average score", async () => {
        const result = await getDashboardStats();

        expect(result.success).toBe(true);
        // Average score may be null or a number
        expect(
          result.data?.averageScore === null ||
            typeof result.data?.averageScore === "number"
        ).toBe(true);
      });

      it("should include streak days", async () => {
        (calculateStreak as jest.Mock).mockResolvedValueOnce(7);

        const result = await getDashboardStats();

        expect(result.success).toBe(true);
        expect(result.data?.streakDays).toBe(7);
      });

      it("should include recent activity", async () => {
        (getRecentActivity as jest.Mock).mockResolvedValueOnce([
          { id: "1", type: "assessment", title: "Test", description: "Test", timestamp: "2024-01-01" },
        ]);

        const result = await getDashboardStats();

        expect(result.success).toBe(true);
        expect(result.data?.recentActivity).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("should handle unexpected errors gracefully", async () => {
        (getCurrentUser as jest.Mock).mockRejectedValueOnce(
          new Error("Unexpected")
        );

        const result = await getDashboardStats();

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to load");
      });
    });

    describe("default role handling", () => {
      it("should treat users without explicit role as students", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({
          id: "user-123",
          app_metadata: {}, // No role defined
        });

        const result = await getDashboardStats();

        expect(result.success).toBe(true);
      });
    });
  });

  describe("getProgressStats", () => {
    beforeEach(() => {
      // Setup for progress stats - handle the parallel Promise.all queries
      mockSelect.mockImplementation(() => {
        return {
          eq: jest.fn().mockImplementation(() => ({
            not: jest.fn().mockImplementation(() => ({
              order: jest.fn().mockResolvedValue({
                data: [{ id: "session-1", started_at: "2024-01-01", submitted_at: "2024-01-01" }],
                error: null,
              }),
            })),
            // For response query without not()
            data: [{ is_correct: true, module: "Math", rt_ms: 1000, session_id: "session-1" }],
            error: null,
          })),
        };
      });
    });

    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

        const result = await getProgressStats();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });

      it("should succeed for authenticated user", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
      });
    });

    describe("rate limiting", () => {
      it("should return error when rate limited", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValueOnce(false);

        const result = await getProgressStats();

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });
    });

    describe("data retrieval", () => {
      it("should fetch assessment sessions", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should include courses completed count", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data?.coursesCompleted).toBeDefined();
      });

      it("should include assessments taken count", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data?.assessmentsTaken).toBeDefined();
      });

      it("should include average score", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data?.averageScore).toBe(75); // From mock
      });

      it("should include total time spent", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data?.totalTimeSpent).toBe(120); // From mock
      });

      it("should include module breakdown", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data?.moduleBreakdown).toBeDefined();
        expect(result.data?.moduleBreakdown.length).toBeGreaterThan(0);
      });

      it("should include recent assessments", async () => {
        const result = await getProgressStats();

        expect(result.success).toBe(true);
        expect(result.data?.recentAssessments).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("should handle unexpected errors gracefully", async () => {
        (getCurrentUser as jest.Mock).mockRejectedValueOnce(
          new Error("Unexpected")
        );

        const result = await getProgressStats();

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to load");
      });
    });
  });
});
