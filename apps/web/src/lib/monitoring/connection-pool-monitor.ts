/**
 * Connection Pool Monitor
 * Tracks Supabase connection pool utilization and alerts on high usage
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authLogger } from "@/lib/auth-logger";
import type { Database } from "@/types/database";

export interface ConnectionPoolMetrics {
  activeConnections: number;
  maxConnections: number;
  utilizationPercent: number;
  timestamp: Date;
}

export interface PoolAlert {
  level: "warning" | "error" | "critical";
  message: string;
  metrics: ConnectionPoolMetrics;
  timestamp: Date;
}

/**
 * Connection Pool Monitor
 * Uses RPC function to query PostgreSQL connection stats
 */
export class ConnectionPoolMonitor {
  private supabase: SupabaseClient<Database> | null = null;
  private alerts: PoolAlert[] = [];
  private readonly maxAlerts = 100;
  private readonly warningThreshold = 70; // 70% utilization
  private readonly errorThreshold = 85; // 85% utilization
  private readonly criticalThreshold = 95; // 95% utilization
  private lastCheckTime = 0;
  private readonly minCheckInterval = 5000; // Check at most every 5 seconds

  constructor() {
    // Lazy initialization - don't create Supabase client until needed
    // This prevents errors during pre-rendering when env vars might not be available
  }

  /**
   * Initialize Supabase client lazily
   */
  private getSupabaseClient(): SupabaseClient<Database> {
    if (!this.supabase) {
      this.supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        },
      );
    }
    return this.supabase;
  }

  /**
   * Get current connection pool metrics
   */
  async getMetrics(): Promise<ConnectionPoolMetrics | null> {
    try {
      const now = Date.now();

      // Prevent excessive checks
      if (now - this.lastCheckTime < this.minCheckInterval) {
        return null;
      }

      this.lastCheckTime = now;

      // Try to get connection stats via RPC if function exists
      try {
        const supabase = this.getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase RPC typing
        const { data, error } = await (supabase as any).rpc("get_connection_stats", {});

        if (error) {
          authLogger.debug("Connection stats RPC not available", {
            error: error.message,
          });
          return null;
        }

        if (
          data &&
          Array.isArray(data) &&
          data.length > 0 &&
          typeof data[0] === "object"
        ) {
          const stats = data[0] as {
            active_connections?: number;
            max_connections?: number;
            utilization_percent?: number;
          };
          return {
            activeConnections: stats.active_connections ?? 0,
            maxConnections: stats.max_connections ?? 0,
            utilizationPercent: stats.utilization_percent ?? 0,
            timestamp: new Date(),
          };
        }
      } catch (rpcError) {
        authLogger.debug("Could not fetch connection stats via RPC", {
          rpcError,
        });
      }

      return null;
    } catch (error) {
      authLogger.error("Failed to get connection pool metrics", { error });
      return null;
    }
  }

  /**
   * Check connection pool health and alert if necessary
   */
  async checkHealth(): Promise<PoolAlert | null> {
    const metrics = await this.getMetrics();

    if (!metrics) {
      return null;
    }

    const utilization = metrics.utilizationPercent;
    let alert: PoolAlert | null = null;

    if (utilization >= this.criticalThreshold) {
      alert = {
        level: "critical",
        message: `CRITICAL: Connection pool at ${utilization.toFixed(1)}% capacity (${metrics.activeConnections}/${metrics.maxConnections} connections)`,
        metrics,
        timestamp: new Date(),
      };
      authLogger.error(alert.message);
    } else if (utilization >= this.errorThreshold) {
      alert = {
        level: "error",
        message: `ERROR: Connection pool at ${utilization.toFixed(1)}% capacity (${metrics.activeConnections}/${metrics.maxConnections} connections)`,
        metrics,
        timestamp: new Date(),
      };
      authLogger.warn(alert.message);
    } else if (utilization >= this.warningThreshold) {
      alert = {
        level: "warning",
        message: `WARNING: Connection pool at ${utilization.toFixed(1)}% capacity (${metrics.activeConnections}/${metrics.maxConnections} connections)`,
        metrics,
        timestamp: new Date(),
      };
      authLogger.warn(alert.message);
    }

    if (alert) {
      this.recordAlert(alert);
    }

    return alert;
  }

  /**
   * Record an alert in history
   */
  private recordAlert(alert: PoolAlert): void {
    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): PoolAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: "warning" | "error" | "critical"): PoolAlert[] {
    return this.alerts.filter((a) => a.level === level);
  }

  /**
   * Clear alert history
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

/**
 * Global connection pool monitor instance
 */
export const connectionPoolMonitor = new ConnectionPoolMonitor();
