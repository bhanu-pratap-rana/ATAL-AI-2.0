/**
 * Tests for Progress Analytics Utilities
 *
 * Tests analytics calculation functions including:
 * - Score and time calculations
 * - Module breakdown calculations
 * - Session response mapping
 * - Recent assessments calculations
 */

import {
  calculateScoreAndTime,
  calculateModuleBreakdown,
  buildResponsesBySessionMap,
  calculateRecentAssessments,
} from "@/app/actions/dashboard-stats/progress-analytics";

describe("progress-analytics", () => {
  describe("calculateScoreAndTime", () => {
    it("should return null for empty responses", () => {
      const result = calculateScoreAndTime([]);

      expect(result.averageScore).toBeNull();
      expect(result.totalTimeSpent).toBe(0);
    });

    it("should return null for null responses", () => {
      const result = calculateScoreAndTime(null);

      expect(result.averageScore).toBeNull();
      expect(result.totalTimeSpent).toBe(0);
    });

    it("should calculate 100% score when all correct", () => {
      const responses = [
        { is_correct: true, rt_ms: 1000 },
        { is_correct: true, rt_ms: 2000 },
        { is_correct: true, rt_ms: 1500 },
      ];

      const result = calculateScoreAndTime(responses);

      expect(result.averageScore).toBe(100);
    });

    it("should calculate 0% score when all incorrect", () => {
      const responses = [
        { is_correct: false, rt_ms: 1000 },
        { is_correct: false, rt_ms: 2000 },
      ];

      const result = calculateScoreAndTime(responses);

      expect(result.averageScore).toBe(0);
    });

    it("should calculate correct percentage for mixed results", () => {
      const responses = [
        { is_correct: true, rt_ms: 1000 },
        { is_correct: false, rt_ms: 2000 },
        { is_correct: true, rt_ms: 1500 },
        { is_correct: false, rt_ms: 1000 },
      ];

      const result = calculateScoreAndTime(responses);

      // 2 correct out of 4 = 50%
      expect(result.averageScore).toBe(50);
    });

    it("should calculate total time in minutes", () => {
      const responses = [
        { is_correct: true, rt_ms: 60000 }, // 1 minute
        { is_correct: true, rt_ms: 120000 }, // 2 minutes
      ];

      const result = calculateScoreAndTime(responses);

      // 180000ms / 60000 = 3 minutes
      expect(result.totalTimeSpent).toBe(3);
    });

    it("should handle null rt_ms values", () => {
      const responses = [
        { is_correct: true, rt_ms: null },
        { is_correct: true, rt_ms: 60000 },
        { is_correct: false, rt_ms: null },
      ];

      const result = calculateScoreAndTime(responses);

      expect(result.averageScore).toBe(67); // 2/3 rounded
      expect(result.totalTimeSpent).toBe(1); // Only 60000ms
    });

    it("should round score to nearest integer", () => {
      const responses = [
        { is_correct: true, rt_ms: 1000 },
        { is_correct: true, rt_ms: 1000 },
        { is_correct: false, rt_ms: 1000 },
      ];

      const result = calculateScoreAndTime(responses);

      // 2/3 = 66.666... should round to 67
      expect(result.averageScore).toBe(67);
    });
  });

  describe("calculateModuleBreakdown", () => {
    it("should return empty array for null responses", () => {
      const result = calculateModuleBreakdown(null);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty responses", () => {
      const result = calculateModuleBreakdown([]);

      expect(result).toEqual([]);
    });

    it("should group responses by module", () => {
      const responses = [
        { module: "Math", is_correct: true },
        { module: "Math", is_correct: false },
        { module: "Science", is_correct: true },
        { module: "Science", is_correct: true },
        { module: "Science", is_correct: false },
      ];

      const result = calculateModuleBreakdown(responses);

      expect(result).toHaveLength(2);

      const math = result.find((m) => m.module === "Math");
      expect(math?.questionsAttempted).toBe(2);
      expect(math?.correctAnswers).toBe(1);
      expect(math?.averageScore).toBe(50);

      const science = result.find((m) => m.module === "Science");
      expect(science?.questionsAttempted).toBe(3);
      expect(science?.correctAnswers).toBe(2);
      expect(science?.averageScore).toBe(67);
    });

    it("should handle null module as 'Unknown'", () => {
      const responses = [
        { module: null, is_correct: true },
        { module: null, is_correct: false },
      ];

      const result = calculateModuleBreakdown(responses);

      expect(result).toHaveLength(1);
      expect(result[0].module).toBe("Unknown");
      expect(result[0].questionsAttempted).toBe(2);
    });

    it("should calculate 100% for all correct in module", () => {
      const responses = [
        { module: "Easy", is_correct: true },
        { module: "Easy", is_correct: true },
        { module: "Easy", is_correct: true },
      ];

      const result = calculateModuleBreakdown(responses);

      expect(result[0].averageScore).toBe(100);
    });

    it("should calculate 0% for all incorrect in module", () => {
      const responses = [
        { module: "Hard", is_correct: false },
        { module: "Hard", is_correct: false },
      ];

      const result = calculateModuleBreakdown(responses);

      expect(result[0].averageScore).toBe(0);
    });
  });

  describe("buildResponsesBySessionMap", () => {
    it("should return empty map for null responses", () => {
      const result = buildResponsesBySessionMap(null);

      expect(result.size).toBe(0);
    });

    it("should return empty map for empty array", () => {
      const result = buildResponsesBySessionMap([]);

      expect(result.size).toBe(0);
    });

    it("should group responses by session_id", () => {
      const responses = [
        { session_id: "s1", value: 1 },
        { session_id: "s1", value: 2 },
        { session_id: "s2", value: 3 },
      ];

      const result = buildResponsesBySessionMap(responses);

      expect(result.size).toBe(2);
      expect(result.get("s1")).toHaveLength(2);
      expect(result.get("s2")).toHaveLength(1);
    });

    it("should preserve all response data", () => {
      const responses = [
        { session_id: "s1", is_correct: true, rt_ms: 1000 },
        { session_id: "s1", is_correct: false, rt_ms: 2000 },
      ];

      const result = buildResponsesBySessionMap(responses);
      const sessionResponses = result.get("s1");

      expect(sessionResponses?.[0].is_correct).toBe(true);
      expect(sessionResponses?.[0].rt_ms).toBe(1000);
      expect(sessionResponses?.[1].is_correct).toBe(false);
      expect(sessionResponses?.[1].rt_ms).toBe(2000);
    });

    it("should handle single session", () => {
      const responses = [{ session_id: "only-one", data: "test" }];

      const result = buildResponsesBySessionMap(responses);

      expect(result.size).toBe(1);
      expect(result.get("only-one")).toHaveLength(1);
    });
  });

  describe("calculateRecentAssessments", () => {
    it("should return empty array for null sessions", () => {
      const responseMap = new Map();
      const result = calculateRecentAssessments(null, responseMap);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty sessions", () => {
      const responseMap = new Map();
      const result = calculateRecentAssessments([], responseMap);

      expect(result).toEqual([]);
    });

    it("should limit to 5 most recent assessments", () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        started_at: `2024-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
        submitted_at: null,
      }));

      const responseMap = new Map();
      sessions.forEach((s) => {
        responseMap.set(s.id, [{ is_correct: true, rt_ms: 1000 }]);
      });

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result).toHaveLength(5);
    });

    it("should calculate score correctly", () => {
      const sessions = [
        {
          id: "s1",
          started_at: "2024-01-01T10:00:00Z",
          submitted_at: "2024-01-01T10:30:00Z",
        },
      ];

      const responseMap = new Map([
        [
          "s1",
          [
            { is_correct: true, rt_ms: 1000 },
            { is_correct: true, rt_ms: 1000 },
            { is_correct: false, rt_ms: 1000 },
            { is_correct: false, rt_ms: 1000 },
          ],
        ],
      ]);

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result[0].score).toBe(50); // 2/4 = 50%
      expect(result[0].totalQuestions).toBe(4);
    });

    it("should calculate time spent in seconds", () => {
      const sessions = [
        { id: "s1", started_at: "2024-01-01T10:00:00Z", submitted_at: null },
      ];

      const responseMap = new Map([
        [
          "s1",
          [
            { is_correct: true, rt_ms: 5000 }, // 5 seconds
            { is_correct: true, rt_ms: 10000 }, // 10 seconds
          ],
        ],
      ]);

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result[0].timeSpent).toBe(15); // 15 seconds total
    });

    it("should use submitted_at for completedAt when available", () => {
      const sessions = [
        {
          id: "s1",
          started_at: "2024-01-01T10:00:00Z",
          submitted_at: "2024-01-01T10:30:00Z",
        },
      ];

      const responseMap = new Map([["s1", [{ is_correct: true, rt_ms: 1000 }]]]);

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result[0].completedAt).toBe("2024-01-01T10:30:00Z");
    });

    it("should use started_at for completedAt when submitted_at is null", () => {
      const sessions = [
        { id: "s1", started_at: "2024-01-01T10:00:00Z", submitted_at: null },
      ];

      const responseMap = new Map([["s1", [{ is_correct: true, rt_ms: 1000 }]]]);

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result[0].completedAt).toBe("2024-01-01T10:00:00Z");
    });

    it("should handle session with no responses", () => {
      const sessions = [
        { id: "s1", started_at: "2024-01-01T10:00:00Z", submitted_at: null },
      ];

      const responseMap = new Map();

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result[0].score).toBe(0);
      expect(result[0].totalQuestions).toBe(0);
      expect(result[0].timeSpent).toBe(0);
    });

    it("should handle null rt_ms values", () => {
      const sessions = [
        { id: "s1", started_at: "2024-01-01T10:00:00Z", submitted_at: null },
      ];

      const responseMap = new Map([
        [
          "s1",
          [
            { is_correct: true, rt_ms: null },
            { is_correct: true, rt_ms: 5000 },
          ],
        ],
      ]);

      const result = calculateRecentAssessments(sessions, responseMap);

      expect(result[0].timeSpent).toBe(5); // Only counts non-null
    });
  });
});
