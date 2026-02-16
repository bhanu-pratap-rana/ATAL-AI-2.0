/**
 * Tests for query-cache.ts
 * Tests LRU cache functionality with TTL and metrics
 */

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { QueryCache } from "@/lib/cache/query-cache";
import { authLogger } from "@/lib/auth-logger";

describe("QueryCache", () => {
  let cache: QueryCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new QueryCache();
  });

  describe("getOrFetch", () => {
    it("should fetch data when cache is empty", async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: "test" });

      const result = await cache.getOrFetch("test-key", fetcher);

      expect(result).toEqual({ data: "test" });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(authLogger.debug).toHaveBeenCalledWith(
        "Cache miss - fetching fresh data",
        expect.any(Object)
      );
    });

    it("should return cached data on second call", async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: "test" });

      await cache.getOrFetch("test-key", fetcher);
      const result = await cache.getOrFetch("test-key", fetcher);

      expect(result).toEqual({ data: "test" });
      expect(fetcher).toHaveBeenCalledTimes(1); // Only called once
      expect(authLogger.debug).toHaveBeenCalledWith(
        "Cache hit",
        expect.any(Object)
      );
    });

    it("should use custom TTL", async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: "test" });
      const customTTL = 1000; // 1 second

      await cache.getOrFetch("test-key", fetcher, customTTL);

      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("should refetch after TTL expires", async () => {
      jest.useFakeTimers();

      const fetcher = jest
        .fn()
        .mockResolvedValueOnce({ data: "first" })
        .mockResolvedValueOnce({ data: "second" });

      const ttl = 1000; // 1 second
      await cache.getOrFetch("test-key", fetcher, ttl);

      // Advance time past TTL
      jest.advanceTimersByTime(1001);

      const result = await cache.getOrFetch("test-key", fetcher, ttl);

      expect(result).toEqual({ data: "second" });
      expect(fetcher).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it("should evict oldest entry when max size is reached", async () => {
      const smallCache = new QueryCache();
      const fetcher = jest.fn().mockImplementation((val) => Promise.resolve(val));

      // Fill the cache with 500 entries (maxSize)
      for (let i = 0; i < 500; i++) {
        await smallCache.getOrFetch(`key-${i}`, () => Promise.resolve(i));
      }

      // Add one more - should evict the first
      await smallCache.getOrFetch("key-500", () => Promise.resolve(500));

      // The oldest key should have been evicted
      const stats = smallCache.getStats();
      expect(stats.size).toBe(500);
      expect(authLogger.debug).toHaveBeenCalledWith(
        "Cache evicted old entry to make room",
        expect.objectContaining({ evictedKey: "key-0" })
      );
    });

    it("should propagate errors from fetcher", async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error("Fetch failed"));

      await expect(cache.getOrFetch("test-key", fetcher)).rejects.toThrow(
        "Fetch failed"
      );

      expect(authLogger.error).toHaveBeenCalledWith(
        "Error during cache fetch",
        expect.objectContaining({ error: "Fetch failed" })
      );
    });

    it("should not cache failed fetches", async () => {
      const fetcher = jest
        .fn()
        .mockRejectedValueOnce(new Error("First fetch failed"))
        .mockResolvedValueOnce({ data: "success" });

      // First call fails
      await expect(cache.getOrFetch("test-key", fetcher)).rejects.toThrow();

      // Second call should try fetching again
      const result = await cache.getOrFetch("test-key", fetcher);

      expect(result).toEqual({ data: "success" });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate", () => {
    it("should invalidate entries matching pattern", async () => {
      await cache.getOrFetch("user:123:profile", () =>
        Promise.resolve({ name: "John" })
      );
      await cache.getOrFetch("user:123:settings", () =>
        Promise.resolve({ theme: "dark" })
      );
      await cache.getOrFetch("user:456:profile", () =>
        Promise.resolve({ name: "Jane" })
      );

      cache.invalidate("user:123");

      const stats = cache.getStats();
      expect(stats.size).toBe(1); // Only user:456 remains
      expect(authLogger.info).toHaveBeenCalledWith("Cache invalidated", {
        pattern: "user:123",
        entriesRemoved: 2,
      });
    });

    it("should not remove entries that don't match pattern", async () => {
      await cache.getOrFetch("admin:dashboard", () =>
        Promise.resolve({ stats: [] })
      );
      await cache.getOrFetch("user:profile", () =>
        Promise.resolve({ name: "Test" })
      );

      cache.invalidate("admin");

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    it("should handle invalidating non-existent pattern", async () => {
      cache.invalidate("non-existent");

      expect(authLogger.info).toHaveBeenCalledWith("Cache invalidated", {
        pattern: "non-existent",
        entriesRemoved: 0,
      });
    });
  });

  describe("clear", () => {
    it("should clear all entries", async () => {
      await cache.getOrFetch("key1", () => Promise.resolve(1));
      await cache.getOrFetch("key2", () => Promise.resolve(2));

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(authLogger.info).toHaveBeenCalledWith("Cache cleared", {
        entriesRemoved: 2,
      });
    });

    it("should reset metrics on clear", async () => {
      await cache.getOrFetch("key1", () => Promise.resolve(1));
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Hit

      cache.clear();

      expect(cache.getHitRatio()).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return correct initial stats", () => {
      const stats = cache.getStats();

      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        size: 0,
        maxSize: 500,
        utilizationPercent: 0,
      });
    });

    it("should track hits and misses correctly", async () => {
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Miss
      await cache.getOrFetch("key2", () => Promise.resolve(2)); // Miss
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
    });

    it("should calculate utilization percentage", async () => {
      // Add 5 entries (1% of maxSize 500)
      for (let i = 0; i < 5; i++) {
        await cache.getOrFetch(`key-${i}`, () => Promise.resolve(i));
      }

      const stats = cache.getStats();
      expect(stats.utilizationPercent).toBe(1);
    });
  });

  describe("getHitRatio", () => {
    it("should return 0 when no requests made", () => {
      expect(cache.getHitRatio()).toBe(0);
    });

    it("should calculate correct hit ratio", async () => {
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Miss
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Hit
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Hit
      await cache.getOrFetch("key1", () => Promise.resolve(1)); // Hit

      expect(cache.getHitRatio()).toBe(75); // 3 hits / 4 total = 75%
    });
  });

  describe("getKeys", () => {
    it("should return empty array when cache is empty", () => {
      expect(cache.getKeys()).toEqual([]);
    });

    it("should return all cached keys", async () => {
      await cache.getOrFetch("key1", () => Promise.resolve(1));
      await cache.getOrFetch("key2", () => Promise.resolve(2));
      await cache.getOrFetch("key3", () => Promise.resolve(3));

      expect(cache.getKeys()).toEqual(["key1", "key2", "key3"]);
    });
  });

  describe("getEntrySize", () => {
    it("should return 0 for non-existent key", () => {
      expect(cache.getEntrySize("non-existent")).toBe(0);
    });

    it("should return estimated size for cached entry", async () => {
      await cache.getOrFetch("key1", () =>
        Promise.resolve({ name: "test", value: 123 })
      );

      const size = cache.getEntrySize("key1");
      expect(size).toBeGreaterThan(0);
    });

    it("should handle circular references gracefully", async () => {
      const circular: Record<string, unknown> = { name: "test" };
      circular.self = circular; // Create circular reference

      // This will be stored but getEntrySize will fail to stringify
      await cache.getOrFetch("circular", () => Promise.resolve(circular));

      const size = cache.getEntrySize("circular");
      expect(size).toBe(0); // Can't stringify circular
      expect(authLogger.warn).toHaveBeenCalled();
    });
  });

  describe("getTotalSize", () => {
    it("should return 0 when cache is empty", () => {
      expect(cache.getTotalSize()).toBe(0);
    });

    it("should return sum of all entry sizes", async () => {
      await cache.getOrFetch("key1", () => Promise.resolve({ a: 1 }));
      await cache.getOrFetch("key2", () => Promise.resolve({ b: 2 }));

      const totalSize = cache.getTotalSize();
      expect(totalSize).toBeGreaterThan(0);
    });
  });
});
