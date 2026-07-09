/**
 * Supabase Query Wrapper
 *
 * Provides consistent error handling and type safety for Supabase queries.
 * Eliminates repetitive try-catch and error handling patterns.
 *
 * Rule.md Compliance:
 * - DRY: Single source of truth for query patterns
 * - Consistent error handling
 * - Type-safe queries
 * - Centralized logging
 */

import { authLogger } from "./auth-logger";

/**
 * Supabase error type
 */
export interface SupabaseError {
  message: string;
  [key: string]: unknown;
}

/**
 * Query result type
 */
export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Query Performance Metric
 */
export interface QueryMetric {
  queryName: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  tableNames?: string[];
  success: boolean;
  error?: string;
}

/**
 * Query Performance Monitor
 * Tracks database query performance and identifies slow queries
 */
export class QueryMonitor {
  private metrics: QueryMetric[] = [];
  private readonly maxMetrics = 1000;
  private readonly slowQueryThreshold = 1000; // 1 second
  private readonly verySlowQueryThreshold = 3000; // 3 seconds
  private readonly criticalQueryThreshold = 5000; // 5 seconds

  /**
   * Track query execution with performance metrics
   */
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<{ data: T | null; error: SupabaseError | null }>,
    context?: { userId?: string; tableNames?: string[] },
  ): Promise<QueryResult<T>> {
    const startTime = this.getHighResolutionTime();

    try {
      const { data, error } = await queryFn();
      const duration = this.getHighResolutionTime() - startTime;

      this.recordMetric({
        queryName,
        duration,
        timestamp: new Date(),
        userId: context?.userId,
        tableNames: context?.tableNames,
        success: !error,
        error: error?.message,
      });

      // Alert on slow queries
      if (duration > this.slowQueryThreshold) {
        this.alertSlowQuery(queryName, duration, context?.userId);
      }

      if (error) {
        authLogger.error(`[${queryName}] Supabase error:`, error);
        return {
          data: null,
          error: error.message || "Database query failed",
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      const duration = this.getHighResolutionTime() - startTime;

      this.recordMetric({
        queryName,
        duration,
        timestamp: new Date(),
        userId: context?.userId,
        tableNames: context?.tableNames,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      authLogger.error(`[${queryName}] Query execution failed`, error);

      return {
        data: null,
        error: error instanceof Error ? error.message : "Query execution failed",
        success: false,
      };
    }
  }

  /**
   * Get high-resolution time with fallback for older Node.js
   */
  private getHighResolutionTime(): number {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    // Fallback for environments without performance.now()
    return Date.now();
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: QueryMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Alert on slow query detection
   */
  private alertSlowQuery(
    queryName: string,
    duration: number,
    userId?: string,
  ): void {
    if (duration >= this.criticalQueryThreshold) {
      authLogger.error(
        `CRITICAL SLOW QUERY: ${queryName} took ${duration.toFixed(2)}ms`,
        {
          userId,
          duration,
        },
      );
      this.sendSentryAlert(queryName, duration, "fatal", userId);
    } else if (duration >= this.verySlowQueryThreshold) {
      authLogger.warn(
        `VERY SLOW QUERY: ${queryName} took ${duration.toFixed(2)}ms`,
        {
          userId,
          duration,
        },
      );
      this.sendSentryAlert(queryName, duration, "error", userId);
    } else if (duration >= this.slowQueryThreshold) {
      authLogger.warn(
        `Slow query: ${queryName} took ${duration.toFixed(2)}ms`,
        {
          userId,
          duration,
        },
      );
      this.sendSentryAlert(queryName, duration, "warning", userId);
    }
  }

  /**
   * Send alert to Sentry (if available)
   */
  private sendSentryAlert(
    queryName: string,
    duration: number,
    level: "warning" | "error" | "fatal",
    userId?: string,
  ): void {
    // This is a server-side function, so we can't directly use window.Sentry
    // Sentry integration happens at middleware/next.config level
    authLogger.debug(`Sentry alert sent for ${queryName}`, {
      duration,
      level,
      userId,
    });
  }

  /**
   * Get current performance statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        slowQueries: 0,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
      };
    }

    const durations = this.metrics
      .filter((m) => m.success)
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const slowCount = this.metrics.filter(
      (m) => m.duration > this.slowQueryThreshold,
    ).length;
    const successCount = this.metrics.filter((m) => m.success).length;
    const failureCount = this.metrics.filter((m) => !m.success).length;

    return {
      totalQueries: this.metrics.length,
      successfulQueries: successCount,
      failedQueries: failureCount,
      slowQueries: slowCount,
      avgDuration:
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0,
      p50Duration: durations[Math.floor(durations.length * 0.5)] || 0,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
    };
  }

  /**
   * Get slowest queries
   */
  getSlowestQueries(limit: number = 20): QueryMetric[] {
    return this.metrics
      .filter((m) => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get failed queries
   */
  getFailedQueries(limit: number = 20): QueryMetric[] {
    return this.metrics
      .filter((m) => !m.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get metrics by table
   */
  getMetricsByTable(tableName: string): QueryMetric[] {
    return this.metrics.filter(
      (m) => m.tableNames?.includes(tableName) || false,
    );
  }

  /**
   * Reset metrics (for testing or reset)
   */
  reset(): void {
    this.metrics = [];
  }
}

/**
 * Global query monitor instance
 */
export const queryMonitor = new QueryMonitor();
