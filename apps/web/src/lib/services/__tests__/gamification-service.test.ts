/**
 * @jest-environment jsdom
 */

import { GamificationService, gamificationService } from "../gamification-service";

// Mock supabase-server
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockGte = jest.fn();
const mockLimit = jest.fn();
const mockOrder = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("GamificationService", () => {
  let service: GamificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GamificationService();

    // Setup default mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      gte: mockGte,
      order: mockOrder,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      gte: mockGte,
      limit: mockLimit,
      order: mockOrder,
      not: jest.fn().mockReturnValue({ order: mockOrder }),
    });

    mockIn.mockReturnValue({
      limit: mockLimit,
      order: mockOrder,
    });

    mockGte.mockReturnValue({
      limit: mockLimit,
    });

    // order() returns an object with limit() method
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });

    // Also allow order to resolve directly for cases where limit isn't called
    mockOrder.mockImplementation(() => ({
      limit: mockLimit,
      then: (resolve: (val: { data: unknown[] }) => void) => resolve({ data: [] }),
    }));

    mockLimit.mockResolvedValue({ data: [] });
    mockInsert.mockResolvedValue({ error: null });
  });

  describe("checkAndAwardBadges", () => {
    it("returns empty array when RPC fails", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });

      const result = await service.checkAndAwardBadges("student-123");

      expect(result).toEqual([]);
      expect(mockRpc).toHaveBeenCalledWith("batch_check_and_award_badges", {
        p_student_id: "student-123",
      });
    });

    it("returns empty array when no badges awarded", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.checkAndAwardBadges("student-123");

      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await service.checkAndAwardBadges("student-123");

      expect(result).toEqual([]);
    });

    it("transforms awarded badges correctly", async () => {
      const mockBadges = [
        {
          badge_id: "badge-1",
          badge_name_en: "First Steps",
          badge_name_hi: "पहला कदम",
          badge_name_as: "প্ৰথম পদক্ষেপ",
          points_awarded: 100,
        },
        {
          badge_id: "badge-2",
          badge_name_en: "Curious Mind",
          badge_name_hi: "जिज्ञासु मन",
          badge_name_as: "কৌতূহলী মন",
          points_awarded: 50,
        },
      ];
      mockRpc.mockResolvedValue({ data: mockBadges, error: null });

      const result = await service.checkAndAwardBadges("student-123");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "badge-1",
        name_en: "First Steps",
        name_hi: "पहला कदम",
        name_as: "প্ৰথম পদক্ষেপ",
        points_value: 100,
      });
    });

    it("handles exception during badge check", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      const result = await service.checkAndAwardBadges("student-123");

      expect(result).toEqual([]);
    });

    it("handles non-Error exception", async () => {
      mockRpc.mockRejectedValue("String error");

      const result = await service.checkAndAwardBadges("student-123");

      expect(result).toEqual([]);
    });
  });

  describe("awardPoints", () => {
    it("inserts points into points_history", async () => {
      await service.awardPoints("student-123", 50, "lesson", "Completed lesson 1");

      expect(mockFrom).toHaveBeenCalledWith("points_history");
      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-123",
        points: 50,
        source: "lesson",
        description: "Completed lesson 1",
      });
    });

    it("awards points without description", async () => {
      await service.awardPoints("student-123", 25, "assessment");

      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-123",
        points: 25,
        source: "assessment",
        description: undefined,
      });
    });

    it("handles insert error gracefully", async () => {
      mockInsert.mockRejectedValue(new Error("Insert failed"));

      // Should not throw
      await expect(
        service.awardPoints("student-123", 50, "lesson")
      ).resolves.toBeUndefined();
    });

    it("handles non-Error exception gracefully", async () => {
      mockInsert.mockRejectedValue("String error");

      await expect(
        service.awardPoints("student-123", 50, "lesson")
      ).resolves.toBeUndefined();
    });
  });

  describe("getTotalPoints", () => {
    it("returns sum of all points", async () => {
      // getTotalPoints uses: from().select().eq() - no order/limit
      mockEq.mockResolvedValue({
        data: [{ points: 50 }, { points: 100 }, { points: 25 }],
      });

      const result = await service.getTotalPoints("student-123");

      expect(result).toBe(175);
      expect(mockFrom).toHaveBeenCalledWith("points_history");
    });

    it("returns 0 when no points data", async () => {
      mockEq.mockResolvedValue({ data: null });

      const result = await service.getTotalPoints("student-123");

      expect(result).toBe(0);
    });

    it("returns 0 when data is empty array", async () => {
      mockEq.mockResolvedValue({ data: [] });

      const result = await service.getTotalPoints("student-123");

      expect(result).toBe(0);
    });

    it("handles exception gracefully", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = await service.getTotalPoints("student-123");

      expect(result).toBe(0);
    });

    it("handles non-Error exception", async () => {
      mockFrom.mockImplementation(() => {
        throw "String error";
      });

      const result = await service.getTotalPoints("student-123");

      expect(result).toBe(0);
    });
  });

  describe("getStudentBadges", () => {
    it("returns student badges with badge details", async () => {
      const mockBadges = [
        {
          id: "sb-1",
          student_id: "student-123",
          badge_id: "badge-1",
          earned_at: "2024-01-15T10:00:00Z",
          badge: { id: "badge-1", name_en: "First Steps" },
        },
      ];
      mockOrder.mockResolvedValue({ data: mockBadges });

      const result = await service.getStudentBadges("student-123");

      expect(result).toEqual(mockBadges);
      expect(mockFrom).toHaveBeenCalledWith("student_badges");
    });

    it("returns empty array when no badges", async () => {
      mockOrder.mockResolvedValue({ data: null });

      const result = await service.getStudentBadges("student-123");

      expect(result).toEqual([]);
    });

    it("handles exception gracefully", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Query error");
      });

      const result = await service.getStudentBadges("student-123");

      expect(result).toEqual([]);
    });

    it("handles non-Error exception", async () => {
      mockFrom.mockImplementation(() => {
        throw "String error";
      });

      const result = await service.getStudentBadges("student-123");

      expect(result).toEqual([]);
    });
  });

  describe("getPointsHistory", () => {
    it("returns points history with default limit", async () => {
      const mockHistory = [
        { id: "1", student_id: "s1", points: 50, reason: "lesson", created_at: "2024-01-15" },
        { id: "2", student_id: "s1", points: 25, reason: "question", created_at: "2024-01-14" },
      ];
      mockLimit.mockResolvedValue({ data: mockHistory });

      const result = await service.getPointsHistory("student-123");

      expect(result).toEqual(mockHistory);
      expect(mockFrom).toHaveBeenCalledWith("points_history");
    });

    it("respects custom limit", async () => {
      mockLimit.mockResolvedValue({ data: [] });

      await service.getPointsHistory("student-123", 5);

      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it("returns empty array when data is null", async () => {
      mockLimit.mockResolvedValue({ data: null });

      const result = await service.getPointsHistory("student-123");

      expect(result).toEqual([]);
    });

    it("handles exception gracefully", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("History error");
      });

      const result = await service.getPointsHistory("student-123");

      expect(result).toEqual([]);
    });

    it("handles non-Error exception", async () => {
      mockFrom.mockImplementation(() => {
        throw "String error";
      });

      const result = await service.getPointsHistory("student-123");

      expect(result).toEqual([]);
    });
  });

  describe("getClassLeaderboard", () => {
    beforeEach(() => {
      // Reset mock to setup enrollment chain
      mockFrom.mockImplementation((table: string) => {
        if (table === "enrollments") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ student_id: "s1" }, { student_id: "s2" }],
              }),
            }),
          };
        }
        if (table === "points_history") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { student_id: "s1", points: 100 },
                  { student_id: "s1", points: 50 },
                  { student_id: "s2", points: 75 },
                ],
              }),
            }),
          };
        }
        return { select: mockSelect, insert: mockInsert };
      });
    });

    it("returns leaderboard sorted by points", async () => {
      const result = await service.getClassLeaderboard("class-123");

      expect(result).toHaveLength(2);
      expect(result[0].points).toBe(150); // s1: 100 + 50
      expect(result[0].rank).toBe(1);
      expect(result[1].points).toBe(75); // s2
      expect(result[1].rank).toBe(2);
    });

    it("respects custom limit", async () => {
      const result = await service.getClassLeaderboard("class-123", 1);

      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
    });

    it("returns empty array when no enrollments", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "enrollments") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const result = await service.getClassLeaderboard("class-123");

      expect(result).toEqual([]);
    });

    it("handles exception gracefully", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Leaderboard error");
      });

      const result = await service.getClassLeaderboard("class-123");

      expect(result).toEqual([]);
    });

    it("handles non-Error exception", async () => {
      mockFrom.mockImplementation(() => {
        throw "String error";
      });

      const result = await service.getClassLeaderboard("class-123");

      expect(result).toEqual([]);
    });

    it("handles null points data", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "enrollments") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ student_id: "s1" }],
              }),
            }),
          };
        }
        if (table === "points_history") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const result = await service.getClassLeaderboard("class-123");

      expect(result).toEqual([]);
    });
  });

  describe("triggerActivityCheck", () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({ data: [], error: null });
    });

    it("awards points for lesson activity", async () => {
      await service.triggerActivityCheck("student-123", "lesson");

      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-123",
        points: 10,
        source: "lesson",
        description: "Completed lesson",
      });
    });

    it("awards points for question activity", async () => {
      await service.triggerActivityCheck("student-123", "question");

      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-123",
        points: 5,
        source: "question",
        description: "Completed question",
      });
    });

    it("awards points for assessment activity", async () => {
      await service.triggerActivityCheck("student-123", "assessment");

      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-123",
        points: 20,
        source: "assessment",
        description: "Completed assessment",
      });
    });

    it("awards points for voice activity", async () => {
      await service.triggerActivityCheck("student-123", "voice");

      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-123",
        points: 15,
        source: "voice",
        description: "Completed voice",
      });
    });

    it("checks for badges after awarding points", async () => {
      const mockBadge = {
        badge_id: "badge-1",
        badge_name_en: "First Steps",
        badge_name_hi: "Test",
        badge_name_as: "Test",
        points_awarded: 100,
      };
      mockRpc.mockResolvedValue({ data: [mockBadge], error: null });

      const result = await service.triggerActivityCheck("student-123", "lesson");

      expect(result).toHaveLength(1);
      expect(result[0].name_en).toBe("First Steps");
    });
  });

  describe("gamificationService singleton", () => {
    it("exports a singleton instance", () => {
      expect(gamificationService).toBeInstanceOf(GamificationService);
    });
  });

  // =====================================================
  // Private Methods Tests (via type casting)
  // These methods are dead code but need coverage
  // =====================================================
  describe("Private Methods (dead code coverage)", () => {
    // Access private methods for testing
    const getPrivateMethod = <T extends keyof GamificationService>(
      instance: GamificationService,
      methodName: string
    ): ((...args: unknown[]) => Promise<boolean>) => {
      return (instance as Record<string, unknown>)[methodName] as ((...args: unknown[]) => Promise<boolean>);
    };

    describe("checkLessonsCompleted", () => {
      it("returns true when lessons completed meets threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ count: 15 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkLessonsCompleted");
        const result = await checkMethod.call(service, "student-123", 10);

        expect(result).toBe(true);
      });

      it("returns false when lessons completed is below threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ count: 5 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkLessonsCompleted");
        const result = await checkMethod.call(service, "student-123", 10);

        expect(result).toBe(false);
      });
    });

    describe("checkHighScore", () => {
      it("returns true when high score exists", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ total_score: 95 }] }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkHighScore");
        const result = await checkMethod.call(service, "student-123", 90);

        expect(result).toBe(true);
      });

      it("returns false when no high score exists", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkHighScore");
        const result = await checkMethod.call(service, "student-123", 90);

        expect(result).toBe(false);
      });

      it("returns false on error", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkHighScore");
        const result = await checkMethod.call(service, "student-123", 90);

        expect(result).toBe(false);
      });
    });

    describe("checkWeeklyStreak", () => {
      it("returns true when weekly streak meets threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ count: 5 }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkWeeklyStreak");
        const result = await checkMethod.call(service, "student-123", 3);

        expect(result).toBe(true);
      });

      it("returns false when weekly streak is below threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ count: 1 }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkWeeklyStreak");
        const result = await checkMethod.call(service, "student-123", 3);

        expect(result).toBe(false);
      });
    });

    describe("checkModulesMastered", () => {
      it("returns true when modules mastered meets threshold", async () => {
        // Create data with 3 modules, each with 10+ topics and avg >= 70
        const mockData = [];
        for (let m = 0; m < 3; m++) {
          for (let t = 0; t < 10; t++) {
            mockData.push({ module_id: `module-${m}`, mastery_score: 80 });
          }
        }

        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockData }),
        });

        const checkMethod = getPrivateMethod(service, "checkModulesMastered");
        const result = await checkMethod.call(service, "student-123", 2);

        expect(result).toBe(true);
      });

      it("returns false when modules mastered is below threshold", async () => {
        const mockData = [
          { module_id: "module-1", mastery_score: 50 },
        ];

        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockData }),
        });

        const checkMethod = getPrivateMethod(service, "checkModulesMastered");
        const result = await checkMethod.call(service, "student-123", 5);

        expect(result).toBe(false);
      });

      it("returns false on error", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        });

        const checkMethod = getPrivateMethod(service, "checkModulesMastered");
        const result = await checkMethod.call(service, "student-123", 5);

        expect(result).toBe(false);
      });

      it("returns false when data is null", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null }),
        });

        const checkMethod = getPrivateMethod(service, "checkModulesMastered");
        const result = await checkMethod.call(service, "student-123", 5);

        expect(result).toBe(false);
      });
    });

    describe("checkPerfectScore", () => {
      it("returns true when perfect score exists", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ total_score: 100 }] }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkPerfectScore");
        const result = await checkMethod.call(service, "student-123");

        expect(result).toBe(true);
      });

      it("returns false when no perfect score exists", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkPerfectScore");
        const result = await checkMethod.call(service, "student-123");

        expect(result).toBe(false);
      });
    });

    describe("checkVoiceInteractions", () => {
      it("returns true when voice interactions meet threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 15 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkVoiceInteractions");
        const result = await checkMethod.call(service, "student-123", 10);

        expect(result).toBe(true);
      });

      it("returns false when voice interactions below threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 5 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkVoiceInteractions");
        const result = await checkMethod.call(service, "student-123", 10);

        expect(result).toBe(false);
      });
    });

    describe("checkFirstLesson", () => {
      it("returns true when at least one lesson completed", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1 }),
        });

        const checkMethod = getPrivateMethod(service, "checkFirstLesson");
        const result = await checkMethod.call(service, "student-123");

        expect(result).toBe(true);
      });

      it("returns false when no lessons completed", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0 }),
        });

        const checkMethod = getPrivateMethod(service, "checkFirstLesson");
        const result = await checkMethod.call(service, "student-123");

        expect(result).toBe(false);
      });
    });

    describe("checkQuestionsAsked", () => {
      it("returns true when questions asked meets threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 25 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkQuestionsAsked");
        const result = await checkMethod.call(service, "student-123", 20);

        expect(result).toBe(true);
      });

      it("returns false when questions asked below threshold", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 10 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkQuestionsAsked");
        const result = await checkMethod.call(service, "student-123", 20);

        expect(result).toBe(false);
      });
    });

    describe("checkNightActivity", () => {
      it("returns true when night activities meet threshold", async () => {
        // Create local date objects for night hours (9 PM to 6 AM)
        const createNightDate = (hour: number): string => {
          const d = new Date();
          d.setHours(hour, 0, 0, 0);
          return d.toISOString();
        };
        const nightActivities = [
          { created_at: createNightDate(22) }, // 10 PM
          { created_at: createNightDate(23) }, // 11 PM
          { created_at: createNightDate(0) },  // 12 AM
          { created_at: createNightDate(1) },  // 1 AM
          { created_at: createNightDate(2) },  // 2 AM
          { created_at: createNightDate(3) },  // 3 AM
        ];

        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: nightActivities }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkNightActivity");
        const result = await checkMethod.call(service, "student-123", 5);

        expect(result).toBe(true);
      });

      it("returns false when night activities below threshold", async () => {
        // Create timestamps for daytime
        const dayActivities = [
          { created_at: "2024-01-15T10:00:00Z" }, // 10 AM
          { created_at: "2024-01-15T14:00:00Z" }, // 2 PM
        ];

        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: dayActivities }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkNightActivity");
        const result = await checkMethod.call(service, "student-123", 5);

        expect(result).toBe(false);
      });

      it("returns false on error", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkNightActivity");
        const result = await checkMethod.call(service, "student-123", 5);

        expect(result).toBe(false);
      });
    });

    describe("checkEarlyActivity", () => {
      it("returns true when early activities meet threshold", async () => {
        // Create local date objects for early hours (5 AM to 7 AM)
        const createEarlyDate = (hour: number): string => {
          const d = new Date();
          d.setHours(hour, 0, 0, 0);
          return d.toISOString();
        };
        const earlyActivities = [
          { created_at: createEarlyDate(5) },  // 5 AM
          { created_at: createEarlyDate(5) },  // 5 AM
          { created_at: createEarlyDate(6) },  // 6 AM
          { created_at: createEarlyDate(6) },  // 6 AM
        ];

        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: earlyActivities }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkEarlyActivity");
        const result = await checkMethod.call(service, "student-123", 3);

        expect(result).toBe(true);
      });

      it("returns false when early activities below threshold", async () => {
        const activities = [
          { created_at: "2024-01-15T10:00:00Z" }, // 10 AM (not early)
        ];

        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: activities }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkEarlyActivity");
        const result = await checkMethod.call(service, "student-123", 3);

        expect(result).toBe(false);
      });

      it("returns false on error", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkEarlyActivity");
        const result = await checkMethod.call(service, "student-123", 3);

        expect(result).toBe(false);
      });
    });

    describe("checkCriteria", () => {
      beforeEach(() => {
        // Setup default mocks for criteria checks
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [] }),
              gte: jest.fn().mockResolvedValue({ count: 0 }),
            }),
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [] }),
            }),
            limit: jest.fn().mockResolvedValue({ data: [] }),
          }),
          gte: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [] }),
          }),
        });
      });

      it("handles lessons_completed criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ count: 15 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "lessons_completed", threshold: 10 });

        expect(result).toBe(true);
      });

      it("handles high_score criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ total_score: 95 }] }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "high_score", threshold: 90 });

        expect(result).toBe(true);
      });

      it("handles weekly_streak criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ count: 5 }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "weekly_streak", threshold: 3 });

        expect(result).toBe(true);
      });

      it("handles modules_mastered criteria", async () => {
        const mockData = [];
        for (let m = 0; m < 3; m++) {
          for (let t = 0; t < 10; t++) {
            mockData.push({ module_id: `module-${m}`, mastery_score: 80 });
          }
        }
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockData }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "modules_mastered", threshold: 2 });

        expect(result).toBe(true);
      });

      it("handles perfect_score criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ total_score: 100 }] }),
            }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "perfect_score" });

        expect(result).toBe(true);
      });

      it("handles voice_interactions criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 15 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "voice_interactions", threshold: 10 });

        expect(result).toBe(true);
      });

      it("handles first_lesson criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1 }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "first_lesson" });

        expect(result).toBe(true);
      });

      it("handles questions_asked criteria", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 25 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "questions_asked", threshold: 20 });

        expect(result).toBe(true);
      });

      it("handles night_activity criteria", async () => {
        // Create local date objects for night hours (9 PM to 6 AM)
        const createNightDate = (hour: number): string => {
          const d = new Date();
          d.setHours(hour, 0, 0, 0);
          return d.toISOString();
        };
        const nightActivities = [
          { created_at: createNightDate(22) }, // 10 PM
          { created_at: createNightDate(23) }, // 11 PM
          { created_at: createNightDate(0) },  // 12 AM
          { created_at: createNightDate(1) },  // 1 AM
          { created_at: createNightDate(2) },  // 2 AM
        ];
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: nightActivities }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "night_activity", threshold: 5 });

        expect(result).toBe(true);
      });

      it("handles early_activity criteria", async () => {
        // Create local date objects for early hours (5 AM to 7 AM)
        const createEarlyDate = (hour: number): string => {
          const d = new Date();
          d.setHours(hour, 0, 0, 0);
          return d.toISOString();
        };
        const earlyActivities = [
          { created_at: createEarlyDate(5) },  // 5 AM
          { created_at: createEarlyDate(5) },  // 5 AM
          { created_at: createEarlyDate(6) },  // 6 AM
        ];
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: earlyActivities }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "early_activity", threshold: 3 });

        expect(result).toBe(true);
      });

      it("returns false for unknown criteria type", async () => {
        const checkMethod = getPrivateMethod(service, "checkCriteria");
        const result = await checkMethod.call(service, "student-123", { type: "unknown_type" as "first_lesson" });

        expect(result).toBe(false);
      });

      it("uses default thresholds when threshold is not provided", async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ count: 15 }),
          }),
        });

        const checkMethod = getPrivateMethod(service, "checkCriteria");
        // No threshold provided, should use default (10 for lessons_completed)
        const result = await checkMethod.call(service, "student-123", { type: "lessons_completed" });

        expect(result).toBe(true);
      });
    });
  });
});
