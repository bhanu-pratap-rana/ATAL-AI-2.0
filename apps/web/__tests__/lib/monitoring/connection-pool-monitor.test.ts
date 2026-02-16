/**
 * Tests for connection-pool-monitor.ts
 * Tests connection pool monitoring and alerting
 */

const mockRpc = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    rpc: mockRpc,
  })),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ConnectionPoolMonitor } from "@/lib/monitoring/connection-pool-monitor";
import { authLogger } from "@/lib/auth-logger";

describe("ConnectionPoolMonitor", () => {
  let monitor: ConnectionPoolMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    monitor = new ConnectionPoolMonitor();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getMetrics", () => {
    it("should return null if called too frequently", async () => {
      // First call
      mockRpc.mockResolvedValue({
        data: [{ active_connections: 10, max_connections: 100, utilization_percent: 10 }],
        error: null,
      });

      await monitor.getMetrics();

      // Second call within 5 seconds should return null
      const result = await monitor.getMetrics();

      expect(result).toBeNull();
    });

    it("should return metrics after interval has passed", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 25,
            max_connections: 100,
            utilization_percent: 25,
          },
        ],
        error: null,
      });

      await monitor.getMetrics();

      // Advance time past the interval
      jest.advanceTimersByTime(6000);

      const result = await monitor.getMetrics();

      expect(result).not.toBeNull();
      expect(result?.activeConnections).toBe(25);
      expect(result?.maxConnections).toBe(100);
      expect(result?.utilizationPercent).toBe(25);
    });

    it("should return null when RPC fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC not available" },
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.getMetrics();

      expect(result).toBeNull();
      expect(authLogger.debug).toHaveBeenCalledWith(
        "Connection stats RPC not available",
        expect.any(Object)
      );
    });

    it("should return null when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      jest.advanceTimersByTime(6000);
      const result = await monitor.getMetrics();

      expect(result).toBeNull();
    });

    it("should handle empty data array", async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.getMetrics();

      expect(result).toBeNull();
    });

    it("should handle missing fields in data", async () => {
      mockRpc.mockResolvedValue({
        data: [{}],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.getMetrics();

      expect(result).not.toBeNull();
      expect(result?.activeConnections).toBe(0);
      expect(result?.maxConnections).toBe(0);
      expect(result?.utilizationPercent).toBe(0);
    });
  });

  describe("checkHealth", () => {
    it("should return null when no metrics available", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Error" },
      });

      const result = await monitor.checkHealth();

      expect(result).toBeNull();
    });

    it("should return null when utilization is below warning threshold", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 50,
            max_connections: 100,
            utilization_percent: 50,
          },
        ],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.checkHealth();

      expect(result).toBeNull();
    });

    it("should return warning alert at 70% utilization", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 70,
            max_connections: 100,
            utilization_percent: 70,
          },
        ],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.checkHealth();

      expect(result).not.toBeNull();
      expect(result?.level).toBe("warning");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return error alert at 85% utilization", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 85,
            max_connections: 100,
            utilization_percent: 85,
          },
        ],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.checkHealth();

      expect(result).not.toBeNull();
      expect(result?.level).toBe("error");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return critical alert at 95% utilization", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 95,
            max_connections: 100,
            utilization_percent: 95,
          },
        ],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      const result = await monitor.checkHealth();

      expect(result).not.toBeNull();
      expect(result?.level).toBe("critical");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should record alerts in history", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 75,
            max_connections: 100,
            utilization_percent: 75,
          },
        ],
        error: null,
      });

      jest.advanceTimersByTime(6000);
      await monitor.checkHealth();

      const alerts = monitor.getRecentAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe("warning");
    });
  });

  describe("getRecentAlerts", () => {
    it("should return empty array when no alerts", () => {
      const alerts = monitor.getRecentAlerts();
      expect(alerts).toEqual([]);
    });

    it("should return alerts sorted by timestamp descending", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 75,
            max_connections: 100,
            utilization_percent: 75,
          },
        ],
        error: null,
      });

      // First alert
      await monitor.checkHealth();

      // Advance time and trigger another check
      jest.advanceTimersByTime(6000);
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 90,
            max_connections: 100,
            utilization_percent: 90,
          },
        ],
        error: null,
      });
      await monitor.checkHealth();

      const alerts = monitor.getRecentAlerts();
      expect(alerts).toHaveLength(2);
      // Most recent first
      expect(alerts[0].level).toBe("error");
      expect(alerts[1].level).toBe("warning");
    });

    it("should limit results to specified count", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            active_connections: 75,
            max_connections: 100,
            utilization_percent: 75,
          },
        ],
        error: null,
      });

      // Create multiple alerts
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(6000);
        await monitor.checkHealth();
      }

      const alerts = monitor.getRecentAlerts(2);
      expect(alerts).toHaveLength(2);
    });
  });

  describe("getAlertsByLevel", () => {
    it("should filter alerts by level", async () => {
      // Create warning
      mockRpc.mockResolvedValue({
        data: [
          { active_connections: 75, max_connections: 100, utilization_percent: 75 },
        ],
        error: null,
      });
      await monitor.checkHealth();

      // Create error
      jest.advanceTimersByTime(6000);
      mockRpc.mockResolvedValue({
        data: [
          { active_connections: 90, max_connections: 100, utilization_percent: 90 },
        ],
        error: null,
      });
      await monitor.checkHealth();

      const warnings = monitor.getAlertsByLevel("warning");
      const errors = monitor.getAlertsByLevel("error");

      expect(warnings).toHaveLength(1);
      expect(errors).toHaveLength(1);
    });

    it("should return empty array for level with no alerts", () => {
      const criticals = monitor.getAlertsByLevel("critical");
      expect(criticals).toEqual([]);
    });
  });

  describe("clearAlerts", () => {
    it("should clear all alerts", async () => {
      mockRpc.mockResolvedValue({
        data: [
          { active_connections: 75, max_connections: 100, utilization_percent: 75 },
        ],
        error: null,
      });

      await monitor.checkHealth();
      expect(monitor.getRecentAlerts()).toHaveLength(1);

      monitor.clearAlerts();
      expect(monitor.getRecentAlerts()).toHaveLength(0);
    });
  });

  describe("alert history limit", () => {
    it("should trim old alerts when exceeding maxAlerts", async () => {
      mockRpc.mockResolvedValue({
        data: [
          { active_connections: 75, max_connections: 100, utilization_percent: 75 },
        ],
        error: null,
      });

      // Create more than maxAlerts (100) alerts
      for (let i = 0; i < 105; i++) {
        jest.advanceTimersByTime(6000);
        await monitor.checkHealth();
      }

      const alerts = monitor.getRecentAlerts(200);
      expect(alerts.length).toBeLessThanOrEqual(100);
    });
  });
});
