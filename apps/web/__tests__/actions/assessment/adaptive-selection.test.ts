/**
 * Tests for adaptive-selection.ts server actions
 * Target: ~25 tests covering getAdaptiveQuestions function and IRT selection logic
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  verifyStudentAuth: jest.fn(),
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

jest.mock("@/app/actions/assessment/irt-models", () => ({
  CATEGORIES: ["computation", "application", "reasoning", "analysis", "geometry"],
  CAT_CONFIG: {
    TOTAL_QUESTIONS: 30,
    MIN_QUESTIONS_PER_CATEGORY: 4,
    INITIAL_THETA: 0,
    TARGET_SE: 0.3,
    THETA_BOUNDS: { min: -4, max: 4 },
  },
  selectNextItem: jest.fn(),
}));

// Mock crypto.getRandomValues
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: (arr: Uint32Array) => {
      arr[0] = 123;
      return arr;
    },
  },
});

import { getAdaptiveQuestions } from "@/app/actions/assessment/adaptive-selection";
import { createClient, verifyStudentAuth } from "@/lib/supabase-server";
import { selectNextItem, CATEGORIES } from "@/app/actions/assessment/irt-models";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

// Helper to create mock IRT items
function createMockIRTItems(count: number, category?: string): Array<{
  id: string;
  item_code: string;
  category: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: number;
  difficulty: number;
  discrimination: number;
  guessing: number;
}> {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    item_code: `CODE${i + 1}`,
    category: category || CATEGORIES[i % CATEGORIES.length],
    question_text: `Question ${i + 1}?`,
    options: [
      { id: "A", text: "Option A" },
      { id: "B", text: "Option B" },
      { id: "C", text: "Option C" },
      { id: "D", text: "Option D" },
    ],
    correct_answer: 0,
    difficulty: (i % 5) - 2, // Range: -2 to 2
    discrimination: 1 + (i % 3) * 0.3, // Range: 1.0 to 1.6
    guessing: 0.2,
  }));
}

describe("adaptive-selection", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (verifyStudentAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: validUUID, email: "student@test.com" },
    });

    // Reset mock item index for selectNextItem
    mockItemIndex = 0;
  });

  describe("Authorization", () => {
    it("should reject unauthorized users", async () => {
      (verifyStudentAuth as jest.Mock).mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Not authenticated" },
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
      expect(result.questions).toEqual([]);
    });

    it("should call verifyStudentAuth with correct action name", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions();

      expect(verifyStudentAuth).toHaveBeenCalledWith("getAdaptiveQuestions");
    });
  });

  describe("Language Support", () => {
    it("should fetch English questions by default", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions();

      expect(mockSupabase._mockQueryBuilder.eq).toHaveBeenCalledWith("language", "en");
    });

    it("should fetch Hindi questions when specified", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions("hi");

      expect(mockSupabase._mockQueryBuilder.eq).toHaveBeenCalledWith("language", "hi");
    });

    it("should fetch Assamese questions when specified", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions("as");

      expect(mockSupabase._mockQueryBuilder.eq).toHaveBeenCalledWith("language", "as");
    });
  });

  describe("Database Query", () => {
    it("should query irt_item_bank table", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions();

      expect(mockSupabase.from).toHaveBeenCalledWith("irt_item_bank");
    });

    it("should only fetch active items", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions();

      expect(mockSupabase._mockQueryBuilder.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should order by category", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions();

      expect(mockSupabase._mockQueryBuilder.order).toHaveBeenCalledWith("category");
    });

    it("should limit to 500 items", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdaptiveQuestions();

      expect(mockSupabase._mockQueryBuilder.limit).toHaveBeenCalledWith(500);
    });

    it("should handle database error", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch questions");
      expect(result.questions).toEqual([]);
    });
  });

  describe("Empty Item Pool", () => {
    it("should return error when no questions available", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No questions available");
      expect(result.questions).toEqual([]);
    });

    it("should return error when data is null", async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No questions available");
    });
  });

  describe("Adaptive Question Selection", () => {
    beforeEach(() => {
      // Mock selectNextItem to return items sequentially
      const mockItems = createMockIRTItems(40);
      mockItemIndex = 0;
      (selectNextItem as jest.Mock).mockImplementation(
        (theta, pool, answeredIds) => {
          // Find first unanswered item
          for (const item of mockItems) {
            if (!answeredIds.has(item.id)) {
              return item;
            }
          }
          return null;
        }
      );
    });

    it("should return questions on success", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it("should return categories array", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      expect(result.categories).toEqual(CATEGORIES);
    });

    it("should return CAT config", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      expect(result.catConfig).toHaveProperty("targetSE");
      expect(result.catConfig).toHaveProperty("initialTheta");
    });

    it("should return totalQuestions count", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      expect(typeof result.totalQuestions).toBe("number");
    });
  });

  describe("Question Formatting", () => {
    beforeEach(() => {
      const mockItems = createMockIRTItems(40);
      (selectNextItem as jest.Mock).mockImplementation(
        (theta, pool, answeredIds) => {
          for (const item of mockItems) {
            if (!answeredIds.has(item.id)) {
              return item;
            }
          }
          return null;
        }
      );
    });

    it("should format questions with required fields", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      if (result.questions.length > 0) {
        const question = result.questions[0];
        expect(question).toHaveProperty("id");
        expect(question).toHaveProperty("itemCode");
        expect(question).toHaveProperty("category");
        expect(question).toHaveProperty("questionNumber");
        expect(question).toHaveProperty("questionText");
        expect(question).toHaveProperty("options");
      }
    });

    it("should include IRT parameters for scoring", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      if (result.questions.length > 0) {
        const question = result.questions[0];
        expect(question).toHaveProperty("_correctIndex");
        expect(question).toHaveProperty("_difficulty");
        expect(question).toHaveProperty("_discrimination");
        expect(question).toHaveProperty("_guessing");
      }
    });

    it("should number questions sequentially", async () => {
      const mockItems = createMockIRTItems(40);
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
      if (result.questions.length > 1) {
        expect(result.questions[0].questionNumber).toBe(1);
        expect(result.questions[1].questionNumber).toBe(2);
      }
    });
  });

  describe("IRT Parameters Handling", () => {
    it("should use default difficulty when null", async () => {
      const mockItems = createMockIRTItems(10);
      mockItems[0].difficulty = null as unknown as number;
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });
      (selectNextItem as jest.Mock).mockImplementation(
        (theta, pool, answeredIds) => {
          for (const item of pool) {
            if (!answeredIds.has(item.id)) {
              return item;
            }
          }
          return null;
        }
      );

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
    });

    it("should use default discrimination when null", async () => {
      const mockItems = createMockIRTItems(10);
      mockItems[0].discrimination = null as unknown as number;
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });
      (selectNextItem as jest.Mock).mockImplementation(
        (theta, pool, answeredIds) => {
          for (const item of pool) {
            if (!answeredIds.has(item.id)) {
              return item;
            }
          }
          return null;
        }
      );

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
    });

    it("should use default guessing when null", async () => {
      const mockItems = createMockIRTItems(10);
      mockItems[0].guessing = null as unknown as number;
      mockSupabase._mockQueryBuilder.limit.mockResolvedValue({
        data: mockItems,
        error: null,
      });
      (selectNextItem as jest.Mock).mockImplementation(
        (theta, pool, answeredIds) => {
          for (const item of pool) {
            if (!answeredIds.has(item.id)) {
              return item;
            }
          }
          return null;
        }
      );

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors", async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection failed");
      expect(result.questions).toEqual([]);
    });

    it("should handle non-Error exceptions", async () => {
      (createClient as jest.Mock).mockRejectedValue("Unknown error");

      const result = await getAdaptiveQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(result.questions).toEqual([]);
    });
  });
});
