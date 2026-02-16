/**
 * Tests for database.ts
 * Target: ~20 tests covering offline database operations
 */

// Mock Dexie - must be before imports
// Create mocks inside the factory to avoid hoisting issues
jest.mock("dexie", () => {
  const mockClearFn = jest.fn().mockResolvedValue(undefined);
  const mockDeleteFn = jest.fn().mockResolvedValue(0);
  const mockBelowFn = jest.fn(() => ({ delete: mockDeleteFn }));
  const mockWhereFn = jest.fn(() => ({ below: mockBelowFn }));

  return {
    __esModule: true,
    default: class MockDexie {
      syncQueue = {
        clear: mockClearFn,
        where: mockWhereFn,
      };
      lessons = {
        clear: mockClearFn,
        where: mockWhereFn,
      };
      progress = {
        clear: mockClearFn,
      };
      conversations = {
        clear: mockClearFn,
        where: mockWhereFn,
      };

      version() {
        return {
          stores: jest.fn().mockReturnThis(),
        };
      }
    },
    // Expose mock functions for testing
    __mockClear: mockClearFn,
    __mockDelete: mockDeleteFn,
    __mockWhere: mockWhereFn,
    __mockBelow: mockBelowFn,
  };
});

import {
  offlineDB,
  isOfflineStorageAvailable,
  getStorageUsage,
  clearExpiredCache,
  clearAllOfflineData,
  type QueuedMutation,
  type CachedLesson,
  type CachedProgress,
  type CachedConversation,
} from "@/lib/offline/database";

// Get mocks from the module
const dexieMock = jest.requireMock("dexie") as {
  __mockClear: jest.Mock;
  __mockDelete: jest.Mock;
  __mockWhere: jest.Mock;
  __mockBelow: jest.Mock;
};

describe("database", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
    dexieMock.__mockDelete.mockResolvedValue(5);
    dexieMock.__mockBelow.mockReturnValue({ delete: dexieMock.__mockDelete });
    dexieMock.__mockWhere.mockReturnValue({ below: dexieMock.__mockBelow });
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe("offlineDB", () => {
    it("should be defined", () => {
      expect(offlineDB).toBeDefined();
    });

    it("should have syncQueue table", () => {
      expect(offlineDB.syncQueue).toBeDefined();
    });

    it("should have lessons table", () => {
      expect(offlineDB.lessons).toBeDefined();
    });

    it("should have progress table", () => {
      expect(offlineDB.progress).toBeDefined();
    });

    it("should have conversations table", () => {
      expect(offlineDB.conversations).toBeDefined();
    });
  });

  describe("isOfflineStorageAvailable", () => {
    it("should return true when indexedDB is available", () => {
      Object.defineProperty(global, "indexedDB", {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isOfflineStorageAvailable()).toBe(true);
    });

    it("should return false when globalThis is undefined", () => {
      // Store original
      const originalIndexedDB = global.indexedDB;

      // Remove indexedDB
      // @ts-expect-error - Testing undefined indexedDB
      delete global.indexedDB;

      const result = isOfflineStorageAvailable();

      // Restore
      if (originalIndexedDB) {
        Object.defineProperty(global, "indexedDB", {
          value: originalIndexedDB,
          writable: true,
          configurable: true,
        });
      }

      expect(result).toBe(false);
    });
  });

  describe("getStorageUsage", () => {
    it("should return zeros when navigator.storage is unavailable", async () => {
      // @ts-expect-error - Testing undefined navigator
      delete global.navigator;

      const usage = await getStorageUsage();

      expect(usage).toEqual({ used: 0, quota: 0, percentUsed: 0 });
    });

    it("should return storage estimate when available", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          storage: {
            estimate: jest.fn().mockResolvedValue({
              usage: 1000000,
              quota: 10000000,
            }),
          },
        },
        writable: true,
        configurable: true,
      });

      const usage = await getStorageUsage();

      expect(usage.used).toBe(1000000);
      expect(usage.quota).toBe(10000000);
      expect(usage.percentUsed).toBe(10);
    });

    it("should handle missing usage in estimate", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          storage: {
            estimate: jest.fn().mockResolvedValue({}),
          },
        },
        writable: true,
        configurable: true,
      });

      const usage = await getStorageUsage();

      expect(usage).toEqual({ used: 0, quota: 0, percentUsed: 0 });
    });

    it("should handle storage.estimate error", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          storage: {
            estimate: jest.fn().mockRejectedValue(new Error("Storage error")),
          },
        },
        writable: true,
        configurable: true,
      });

      const usage = await getStorageUsage();

      expect(usage).toEqual({ used: 0, quota: 0, percentUsed: 0 });
    });
  });

  describe("clearExpiredCache", () => {
    it("should clear expired lessons and old conversations", async () => {
      dexieMock.__mockDelete.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const count = await clearExpiredCache();

      expect(count).toBe(5);
    });
  });

  describe("clearAllOfflineData", () => {
    it("should clear all tables", async () => {
      await clearAllOfflineData();

      // 4 tables cleared
      expect(dexieMock.__mockClear).toHaveBeenCalled();
    });
  });

  describe("QueuedMutation type", () => {
    it("should accept valid assessment_submit mutation", () => {
      const mutation: QueuedMutation = {
        type: "assessment_submit",
        payload: { session_id: "s1", answers: [] },
        timestamp: Date.now(),
        retries: 0,
      };

      expect(mutation.type).toBe("assessment_submit");
    });

    it("should accept valid progress_update mutation", () => {
      const mutation: QueuedMutation = {
        type: "progress_update",
        payload: { student_id: "s1", topic_id: "t1" },
        timestamp: Date.now(),
        retries: 0,
      };

      expect(mutation.type).toBe("progress_update");
    });

    it("should accept valid chat_message mutation", () => {
      const mutation: QueuedMutation = {
        type: "chat_message",
        payload: { message: "Hello" },
        timestamp: Date.now(),
        retries: 0,
      };

      expect(mutation.type).toBe("chat_message");
    });

    it("should accept valid points_award mutation", () => {
      const mutation: QueuedMutation = {
        type: "points_award",
        payload: { points: 10 },
        timestamp: Date.now(),
        retries: 0,
      };

      expect(mutation.type).toBe("points_award");
    });

    it("should accept mutation with lastError", () => {
      const mutation: QueuedMutation = {
        type: "assessment_submit",
        payload: {},
        timestamp: Date.now(),
        retries: 3,
        lastError: "Network error",
      };

      expect(mutation.lastError).toBe("Network error");
    });
  });

  describe("CachedLesson type", () => {
    it("should accept valid cached lesson", () => {
      const lesson: CachedLesson = {
        topic_id: "T1.1",
        module_id: "M1",
        language: "en",
        content: {
          title: "Test Lesson",
          description: "A test lesson",
          sections: [{ type: "text", content: "Hello" }],
        },
        cached_at: Date.now(),
        expires_at: Date.now() + 86400000,
      };

      expect(lesson.topic_id).toBe("T1.1");
      expect(lesson.language).toBe("en");
    });

    it("should accept lesson with questions", () => {
      const lesson: CachedLesson = {
        topic_id: "T1.1",
        module_id: "M1",
        language: "hi",
        content: {
          title: "Test Lesson",
          description: "A test lesson",
          sections: [],
          questions: [
            {
              id: "q1",
              question: "What is 2+2?",
              options: ["3", "4", "5"],
              correctAnswer: "4",
            },
          ],
        },
        cached_at: Date.now(),
        expires_at: Date.now() + 86400000,
      };

      expect(lesson.content.questions).toHaveLength(1);
    });
  });

  describe("CachedProgress type", () => {
    it("should accept valid cached progress", () => {
      const progress: CachedProgress = {
        topic_id: "T1.1",
        student_id: "student-123",
        module_id: "M1",
        mastery_score: 75,
        status: "in_progress",
        last_synced: Date.now(),
      };

      expect(progress.status).toBe("in_progress");
    });

    it("should accept mastered status", () => {
      const progress: CachedProgress = {
        topic_id: "T1.1",
        student_id: "student-123",
        module_id: "M1",
        mastery_score: 95,
        status: "mastered",
        last_synced: Date.now(),
      };

      expect(progress.status).toBe("mastered");
    });
  });

  describe("CachedConversation type", () => {
    it("should accept valid cached conversation", () => {
      const conversation: CachedConversation = {
        session_id: "session-123",
        messages: [
          { role: "user", content: "Hello", timestamp: Date.now() },
          { role: "assistant", content: "Hi there!", timestamp: Date.now() },
        ],
        language: "en",
        last_updated: Date.now(),
      };

      expect(conversation.messages).toHaveLength(2);
    });

    it("should accept conversation with topic_id", () => {
      const conversation: CachedConversation = {
        session_id: "session-123",
        messages: [],
        topic_id: "T1.1",
        language: "as",
        last_updated: Date.now(),
      };

      expect(conversation.topic_id).toBe("T1.1");
      expect(conversation.language).toBe("as");
    });
  });
});
