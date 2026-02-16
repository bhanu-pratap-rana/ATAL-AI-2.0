/**
 * Tests for lesson-cache.ts
 * Target: ~25 tests covering lesson pre-caching functionality
 */

import {
  getTopicsForModule,
  isCacheApiAvailable,
  preCacheLessons,
  preCacheLesson,
  isLessonCached,
  getCachedLesson,
  getCachedLessonsForModule,
  getCacheStats,
  clearModuleCache,
  clearAllLessonCache,
  clearExpiredLessons,
} from "@/lib/offline/lesson-cache";

// Mock dependencies
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockWhere = jest.fn();
const mockEquals = jest.fn();
const mockFilter = jest.fn();
const mockToArray = jest.fn();
const mockDelete = jest.fn();
const mockClear = jest.fn();
const mockBelow = jest.fn();

jest.mock("@/lib/offline/database", () => ({
  offlineDB: {
    lessons: {
      get: (...args: unknown[]) => mockGet(...args),
      put: (...args: unknown[]) => mockPut(...args),
      where: (...args: unknown[]) => mockWhere(...args),
      toArray: () => mockToArray(),
      clear: () => mockClear(),
    },
  },
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("lesson-cache", () => {
  const originalFetch = global.fetch;
  const originalCaches = global.caches;

  const mockCacheMatch = jest.fn();
  const mockCachePut = jest.fn();
  const mockCacheDelete = jest.fn();
  const mockCacheKeys = jest.fn();
  const mockCachesOpen = jest.fn();
  const mockCachesDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock cache
    mockCachesOpen.mockResolvedValue({
      match: mockCacheMatch,
      put: mockCachePut,
      delete: mockCacheDelete,
      keys: mockCacheKeys,
    });

    // Default mock responses
    mockGet.mockResolvedValue(null);
    mockPut.mockResolvedValue(undefined);
    mockWhere.mockReturnValue({ equals: mockEquals, below: mockBelow });
    mockEquals.mockReturnValue({ filter: mockFilter, delete: mockDelete });
    mockFilter.mockReturnValue({ toArray: mockToArray });
    mockToArray.mockResolvedValue([]);
    mockDelete.mockResolvedValue(0);
    mockClear.mockResolvedValue(undefined);
    mockBelow.mockReturnValue({ delete: mockDelete });
    mockCacheMatch.mockResolvedValue(null);
    mockCachePut.mockResolvedValue(undefined);
    mockCacheKeys.mockResolvedValue([]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalCaches) {
      Object.defineProperty(global, "caches", {
        value: originalCaches,
        writable: true,
        configurable: true,
      });
    }
  });

  const setupCacheApi = (available: boolean) => {
    if (available) {
      Object.defineProperty(global, "caches", {
        value: {
          open: mockCachesOpen,
          delete: mockCachesDelete,
        },
        writable: true,
        configurable: true,
      });
    } else {
      // @ts-expect-error - Testing undefined caches
      delete global.caches;
    }
  };

  describe("getTopicsForModule", () => {
    it("should return topics for module M1", () => {
      const topics = getTopicsForModule("M1");

      expect(topics).toHaveLength(10);
      expect(topics[0].id).toBe("T1.1");
      expect(topics[0].title).toContain("Four Jobs");
    });

    it("should return topics for module M2", () => {
      const topics = getTopicsForModule("M2");

      expect(topics).toHaveLength(10);
      expect(topics[0].id).toBe("T4.1");
    });

    it("should return topics for module M3", () => {
      const topics = getTopicsForModule("M3");

      expect(topics).toHaveLength(10);
      expect(topics[0].id).toBe("T9.1");
    });

    it("should return topics for module M4", () => {
      const topics = getTopicsForModule("M4");

      expect(topics).toHaveLength(10);
      expect(topics[0].id).toBe("T12.1");
    });

    it("should return topics for module M5", () => {
      const topics = getTopicsForModule("M5");

      expect(topics).toHaveLength(10);
      expect(topics[0].id).toBe("T16.1");
    });

    it("should return empty array for unknown module", () => {
      const topics = getTopicsForModule("UNKNOWN");

      expect(topics).toHaveLength(0);
    });
  });

  describe("isCacheApiAvailable", () => {
    it("should return true when caches is available", () => {
      setupCacheApi(true);

      expect(isCacheApiAvailable()).toBe(true);
    });

    it("should return false when caches is not available", () => {
      setupCacheApi(false);

      expect(isCacheApiAvailable()).toBe(false);
    });
  });

  describe("preCacheLesson", () => {
    it("should use IndexedDB when Cache API not available", async () => {
      setupCacheApi(false);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ title: "Test" }),
      });

      const result = await preCacheLesson("M1", "T1.1", "en");

      expect(mockPut).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return true if already cached in IndexedDB", async () => {
      setupCacheApi(false);
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockGet.mockResolvedValueOnce({
        topic_id: "T1.1",
        expires_at: Date.now() + 86400000,
      });

      const result = await preCacheLesson("M1", "T1.1", "en");

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return false if already cached in Cache API", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValueOnce({ ok: true });

      const result = await preCacheLesson("M1", "T1.1", "en");

      expect(result).toBe(true);
    });

    it("should cache lesson via Cache API when available", async () => {
      setupCacheApi(true);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        clone: jest.fn().mockReturnValue({}),
      });

      const result = await preCacheLesson("M1", "T1.1", "en");

      expect(mockCachePut).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false on fetch failure", async () => {
      setupCacheApi(true);
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const result = await preCacheLesson("M1", "T1.1", "en");

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      setupCacheApi(false);
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await preCacheLesson("M1", "T1.1", "en");

      expect(result).toBe(false);
    });
  });

  describe("preCacheLessons", () => {
    it("should pre-cache all lessons for a module", async () => {
      setupCacheApi(true);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        clone: jest.fn().mockReturnValue({}),
      });

      const result = await preCacheLessons("M1", "en");

      expect(result.cached).toBe(10);
      expect(result.failed).toBe(0);
    });

    it("should count failed caches", async () => {
      setupCacheApi(true);
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({
          ok: true,
          clone: jest.fn().mockReturnValue({}),
        });
      });

      const result = await preCacheLessons("M1", "en");

      expect(result.failed).toBe(3);
      expect(result.cached).toBe(7);
    });
  });

  describe("isLessonCached", () => {
    it("should return true when cached in Cache API", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValueOnce({ ok: true });

      const result = await isLessonCached("M1", "T1.1", "en");

      expect(result).toBe(true);
    });

    it("should check multiple languages when not specified", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValue(null);

      const result = await isLessonCached("M1", "T1.1");

      // Should check en, hi, as
      expect(mockCacheMatch).toHaveBeenCalledTimes(3);
      expect(result).toBe(false);
    });

    it("should return true when cached in IndexedDB", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValueOnce({
        topic_id: "T1.1",
        expires_at: Date.now() + 86400000,
      });

      const result = await isLessonCached("M1", "T1.1", "en");

      expect(result).toBe(true);
    });

    it("should return false when cache is expired", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValueOnce({
        topic_id: "T1.1",
        expires_at: Date.now() - 1000, // Expired
      });

      const result = await isLessonCached("M1", "T1.1", "en");

      expect(result).toBe(false);
    });
  });

  describe("getCachedLesson", () => {
    it("should return lesson from Cache API", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ title: "Test Lesson" }),
      });

      const result = await getCachedLesson("M1", "T1.1", "en");

      expect(result).toEqual({ title: "Test Lesson" });
    });

    it("should fall back to IndexedDB", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValueOnce({
        topic_id: "T1.1",
        language: "en",
        content: { title: "IndexedDB Lesson" },
        expires_at: Date.now() + 86400000,
      });

      const result = await getCachedLesson("M1", "T1.1", "en");

      expect(result).toEqual({ title: "IndexedDB Lesson" });
    });

    it("should return null if not cached", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValue(null);

      const result = await getCachedLesson("M1", "T1.1", "en");

      expect(result).toBeNull();
    });

    it("should return null if expired in IndexedDB", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValueOnce({
        topic_id: "T1.1",
        language: "en",
        content: { title: "Expired" },
        expires_at: Date.now() - 1000,
      });

      const result = await getCachedLesson("M1", "T1.1", "en");

      expect(result).toBeNull();
    });

    it("should return null if language mismatch", async () => {
      setupCacheApi(true);
      mockCacheMatch.mockResolvedValue(null);
      mockGet.mockResolvedValueOnce({
        topic_id: "T1.1",
        language: "hi",
        content: { title: "Hindi" },
        expires_at: Date.now() + 86400000,
      });

      const result = await getCachedLesson("M1", "T1.1", "en");

      expect(result).toBeNull();
    });
  });

  describe("getCachedLessonsForModule", () => {
    it("should return cached lessons for module", async () => {
      mockToArray.mockResolvedValueOnce([
        { topic_id: "T1.1", module_id: "M1", expires_at: Date.now() + 86400000 },
        { topic_id: "T1.2", module_id: "M1", expires_at: Date.now() + 86400000 },
      ]);

      const lessons = await getCachedLessonsForModule("M1");

      expect(lessons).toHaveLength(2);
    });

    it("should return empty array on error", async () => {
      mockWhere.mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const lessons = await getCachedLessonsForModule("M1");

      expect(lessons).toHaveLength(0);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      mockToArray.mockResolvedValueOnce([
        {
          topic_id: "T1.1",
          module_id: "M1",
          content: { title: "Test" },
          expires_at: Date.now() + 86400000,
        },
        {
          topic_id: "T4.1",
          module_id: "M2",
          content: { title: "Test 2" },
          expires_at: Date.now() + 86400000,
        },
      ]);

      const stats = await getCacheStats();

      expect(stats.cachedCount).toBe(2);
      expect(stats.byModule).toHaveProperty("M1", 1);
      expect(stats.byModule).toHaveProperty("M2", 1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it("should filter out expired lessons", async () => {
      mockToArray.mockResolvedValueOnce([
        {
          topic_id: "T1.1",
          module_id: "M1",
          content: { title: "Valid" },
          expires_at: Date.now() + 86400000,
        },
        {
          topic_id: "T1.2",
          module_id: "M1",
          content: { title: "Expired" },
          expires_at: Date.now() - 1000,
        },
      ]);

      const stats = await getCacheStats();

      expect(stats.cachedCount).toBe(1);
    });
  });

  describe("clearModuleCache", () => {
    it("should clear cache for specific module", async () => {
      setupCacheApi(true);
      mockCacheKeys.mockResolvedValueOnce([
        { url: "/api/lessons/M1/T1.1?lang=en" },
        { url: "/api/lessons/M1/T1.2?lang=en" },
        { url: "/api/lessons/M2/T4.1?lang=en" },
      ]);
      mockDelete.mockResolvedValue(5);

      const count = await clearModuleCache("M1");

      expect(mockCacheDelete).toHaveBeenCalledTimes(2);
      expect(count).toBe(5);
    });

    it("should clear from IndexedDB even if Cache API fails", async () => {
      setupCacheApi(true);
      mockCacheKeys.mockRejectedValueOnce(new Error("Cache error"));
      mockDelete.mockResolvedValue(3);

      const count = await clearModuleCache("M1");

      expect(count).toBe(3);
    });
  });

  describe("clearAllLessonCache", () => {
    it("should clear all caches", async () => {
      setupCacheApi(true);

      await clearAllLessonCache();

      expect(mockCachesDelete).toHaveBeenCalledWith("atal-lessons-v1");
      expect(mockClear).toHaveBeenCalled();
    });

    it("should clear IndexedDB even without Cache API", async () => {
      setupCacheApi(false);

      await clearAllLessonCache();

      expect(mockClear).toHaveBeenCalled();
    });
  });

  describe("clearExpiredLessons", () => {
    it("should delete expired lessons", async () => {
      mockDelete.mockResolvedValueOnce(10);

      const count = await clearExpiredLessons();

      expect(count).toBe(10);
      expect(mockWhere).toHaveBeenCalledWith("expires_at");
    });
  });
});
