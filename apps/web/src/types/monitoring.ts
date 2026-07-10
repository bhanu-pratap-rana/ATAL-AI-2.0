/**
 * Monitoring Types
 * Shared types for query performance and connection pool monitoring
 */

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
 * Connection Pool Metrics
 */
export interface ConnectionPoolMetrics {
  activeConnections: number;
  maxConnections: number;
  utilizationPercent: number;
  timestamp: Date;
}

/**
 * Connection Pool Alert
 */
export interface PoolAlert {
  level: "warning" | "error" | "critical";
  message: string;
  metrics: ConnectionPoolMetrics;
  timestamp: Date;
}

