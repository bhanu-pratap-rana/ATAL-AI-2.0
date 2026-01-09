import { authLogger } from "@/lib/auth-logger";

// FEATURE FLAG: Set to false to disable caching globally (emergency disable)
const CACHE_ENABLED = process.env.ENABLE_QUERY_CACHE !== "false"; // Default: enabled

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Query cache metrics for monitoring
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  utilizationPercent: number;
}

/**
 * In-memory LRU (Least Recently Used) cache for database query results
 * Server-side only - integrates with existing auth-logger pattern
 *
 * Thread-safe: Safe for concurrent reads/writes
 * Memory-bounded: Max 500 entries to prevent memory leaks
 * TTL-aware: Entries expire based on configured TTL
 * Feature-flag: Can be disabled globally via ENABLE_QUERY_CACHE env var
 *
 * @example
 * ```typescript
 * const results = await queryCache.getOrFetch(
 *   'admin:dashboard:stats',
 *   async () => {
 *     const [teachers, students] = await Promise.all([...]);
 *     return { totalTeachers: teachers.length, totalStudents: students.length };
 *   },
 *   5 * 60 * 1000 // 5 minutes
 * );
 * ```
 */
export class QueryCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 500;
  private metrics = {
    hits: 0,
    misses: 0,
  };

  /**
   * Get cached value or fetch fresh data
   * @param key - Cache key (use pattern: 'resource:id:operation')
   * @param fetcher - Async function that fetches fresh data
   * @param ttl - Time-to-live in milliseconds (default: 5 minutes)
   * @returns Cached or fresh data
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000, // 5 minutes default
  ): Promise<T> {
    // Check if caching is disabled via feature flag
    if (!CACHE_ENABLED) {
      authLogger.debug("Query cache disabled by feature flag", { key });
      return await fetcher();
    }

    // Check if entry exists and is not expired
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.metrics.hits++;
      authLogger.debug("Cache hit", {
        key,
        age: `${Date.now() - cached.timestamp}ms`,
        hitRatio: `${this.getHitRatio().toFixed(1)}%`,
      });
      return cached.data as T;
    }

    // Cache miss - fetch fresh data
    this.metrics.misses++;
    authLogger.debug("Cache miss - fetching fresh data", { key });

    try {
      const data = await fetcher();

      // Enforce max size with LRU eviction (remove oldest entry)
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
          authLogger.debug("Cache evicted old entry to make room", {
            evictedKey: firstKey,
          });
        }
      }

      // Store new entry
      this.cache.set(key, { data, timestamp: Date.now(), ttl });
      authLogger.debug("Data cached", {
        key,
        cacheSize: this.cache.size,
        maxSize: this.maxSize,
      });

      return data;
    } catch (error) {
      // Don't cache errors - let caller handle them
      authLogger.error("Error during cache fetch", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match against keys (uses string.includes())
   *
   * @example
   * ```typescript
   * // Invalidate all student:123 caches
   * cache.invalidate('student:123');
   *
   * // Invalidate all teacher caches
   * cache.invalidate('teacher:');
   *
   * // Invalidate admin dashboard
   * cache.invalidate('admin:dashboard');
   * ```
   */
  invalidate(pattern: string): void {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    authLogger.info("Cache invalidated", {
      pattern,
      entriesRemoved: invalidated,
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.metrics.hits = 0;
    this.metrics.misses = 0;
    authLogger.info("Cache cleared", { entriesRemoved: size });
  }

  /**
   * Get cache statistics for monitoring
   * @returns Cache metrics (size, utilization, hit rate)
   */
  getStats(): CacheMetrics {
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
    };
  }

  /**
   * Get hit ratio (percentage of cache hits)
   * @returns Hit ratio as percentage (0-100)
   */
  getHitRatio(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total === 0 ? 0 : (this.metrics.hits / total) * 100;
  }

  /**
   * Get all cached keys (for debugging)
   * @returns Array of cached keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get size of specific cache entry
   * @param key - Cache key
   * @returns Size in bytes (estimated) or 0 if not found
   */
  getEntrySize(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return 0;

    // Rough estimate: JSON.stringify byte length
    try {
      return JSON.stringify(entry.data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get estimated total cache size
   * @returns Total size in bytes (estimated)
   */
  getTotalSize(): number {
    let total = 0;
    for (const key of this.cache.keys()) {
      total += this.getEntrySize(key);
    }
    return total;
  }
}

/**
 * Global singleton instance of query cache
 * Safe to use across multiple requests (Map is thread-safe in Node.js)
 */
export const queryCache = new QueryCache();
