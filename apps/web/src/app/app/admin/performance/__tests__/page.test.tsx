/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PerformanceMonitoringPage from "../page";

// Mock query monitor
const mockGetStats = jest.fn();
const mockGetSlowestQueries = jest.fn();
const mockGetFailedQueries = jest.fn();
const mockReset = jest.fn();

jest.mock("@/lib/supabase-query-wrapper", () => ({
  queryMonitor: {
    getStats: () => mockGetStats(),
    getSlowestQueries: (limit: number) => mockGetSlowestQueries(limit),
    getFailedQueries: (limit: number) => mockGetFailedQueries(limit),
    reset: () => mockReset(),
  },
}));

// Mock connection pool monitor
const mockGetMetrics = jest.fn();
const mockCheckHealth = jest.fn();
const mockGetRecentAlerts = jest.fn();
const mockClearAlerts = jest.fn();

jest.mock("@/lib/monitoring/connection-pool-monitor", () => ({
  connectionPoolMonitor: {
    getMetrics: () => mockGetMetrics(),
    checkHealth: () => mockCheckHealth(),
    getRecentAlerts: (limit: number) => mockGetRecentAlerts(limit),
    clearAlerts: () => mockClearAlerts(),
  },
}));

// Mock UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...props}>{children}</h3>,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  TrendingDown: () => <span data-testid="trending-icon">Trending</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}));

describe("PerformanceMonitoringPage", () => {
  const defaultStats = {
    totalQueries: 100,
    successfulQueries: 95,
    failedQueries: 5,
    slowQueries: 3,
    avgDuration: 150,
    p95Duration: 500,
    p99Duration: 1200,
  };

  const defaultPoolMetrics = {
    activeConnections: 5,
    maxConnections: 20,
    utilizationPercent: 25,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockGetStats.mockReturnValue(defaultStats);
    mockGetSlowestQueries.mockReturnValue([]);
    mockGetFailedQueries.mockReturnValue([]);
    mockGetMetrics.mockResolvedValue(defaultPoolMetrics);
    mockCheckHealth.mockResolvedValue(null);
    mockGetRecentAlerts.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("renders the page title", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("Database Performance Monitoring")).toBeInTheDocument();
    });

    it("renders query performance stats", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("Total Queries")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("95 success, 5 failed")).toBeInTheDocument();
    });

    it("renders slow queries count", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("Slow Queries (>1s)")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders average duration", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("Avg Duration")).toBeInTheDocument();
      expect(screen.getByText("150ms")).toBeInTheDocument();
    });

    it("renders P99 duration", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("P99 Duration")).toBeInTheDocument();
      expect(screen.getByText("1200ms")).toBeInTheDocument();
    });

    it("shows no slow queries message when none detected", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("✅ No slow queries detected")).toBeInTheDocument();
    });
  });

  describe("connection pool status", () => {
    it("renders connection pool stats after metrics load", async () => {
      render(<PerformanceMonitoringPage />);

      // Advance timer to trigger interval
      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      await waitFor(() => {
        expect(screen.getByText("Connection Pool Status")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument(); // activeConnections
        expect(screen.getByText("20")).toBeInTheDocument(); // maxConnections
      });
    });

    it("shows utilization with correct color for low usage", async () => {
      render(<PerformanceMonitoringPage />);

      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      await waitFor(() => {
        expect(screen.getByText("25.0%")).toBeInTheDocument();
        expect(screen.getByText("25.0%").closest("p")).toHaveClass("text-success");
      });
    });

    it("shows utilization with orange color for medium usage", async () => {
      mockGetMetrics.mockResolvedValue({ ...defaultPoolMetrics, utilizationPercent: 75 });

      render(<PerformanceMonitoringPage />);

      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      await waitFor(() => {
        expect(screen.getByText("75.0%")).toBeInTheDocument();
        expect(screen.getByText("75.0%").closest("p")).toHaveClass("text-accent");
      });
    });

    it("shows utilization with red color for high usage", async () => {
      mockGetMetrics.mockResolvedValue({ ...defaultPoolMetrics, utilizationPercent: 90 });

      render(<PerformanceMonitoringPage />);

      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      await waitFor(() => {
        expect(screen.getByText("90.0%")).toBeInTheDocument();
        expect(screen.getByText("90.0%").closest("p")).toHaveClass("text-error");
      });
    });
  });

  describe("slow queries display", () => {
    it("renders slow queries when present", async () => {
      const slowQueries = [
        { queryName: "getUsers", duration: 2500, timestamp: Date.now(), tableNames: ["users"], userId: "user-1" },
        { queryName: "getOrders", duration: 1500, timestamp: Date.now(), tableNames: ["orders"] },
      ];
      mockGetSlowestQueries.mockReturnValue(slowQueries);

      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("getUsers")).toBeInTheDocument();
      expect(screen.getByText("2500ms")).toBeInTheDocument();
      expect(screen.getByText("Tables: users")).toBeInTheDocument();
      expect(screen.getByText("User: user-1")).toBeInTheDocument();
    });
  });

  describe("failed queries display", () => {
    it("renders failed queries section when there are failures", () => {
      const failedQueries = [
        { queryName: "failedQuery", duration: 100, timestamp: Date.now(), error: "Connection timeout" },
      ];
      mockGetFailedQueries.mockReturnValue(failedQueries);

      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("Failed Queries")).toBeInTheDocument();
      expect(screen.getByText("failedQuery")).toBeInTheDocument();
      expect(screen.getByText("Connection timeout")).toBeInTheDocument();
    });

    it("does not render failed queries section when empty", () => {
      mockGetFailedQueries.mockReturnValue([]);

      render(<PerformanceMonitoringPage />);

      expect(screen.queryByText("Failed Queries")).not.toBeInTheDocument();
    });
  });

  describe("pool alerts display", () => {
    it("renders pool alerts when present", async () => {
      mockCheckHealth.mockResolvedValue({ level: "warning", message: "High utilization", timestamp: Date.now() });
      mockGetRecentAlerts.mockReturnValue([
        { level: "warning", message: "High utilization detected", timestamp: Date.now() },
      ]);

      render(<PerformanceMonitoringPage />);

      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      await waitFor(() => {
        expect(screen.getByText("Connection Pool Alerts")).toBeInTheDocument();
        expect(screen.getByText("High utilization detected")).toBeInTheDocument();
      });
    });

    it("applies correct styling for critical alerts", async () => {
      mockCheckHealth.mockResolvedValue({ level: "critical", message: "Critical", timestamp: Date.now() });
      mockGetRecentAlerts.mockReturnValue([
        { level: "critical", message: "Pool exhausted", timestamp: Date.now() },
      ]);

      render(<PerformanceMonitoringPage />);

      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      await waitFor(() => {
        const alertDiv = screen.getByText("Pool exhausted").closest("div");
        expect(alertDiv).toHaveClass("border-error");
      });
    });
  });

  describe("refresh interval control", () => {
    it("renders refresh interval selector", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByLabelText("Refresh Interval")).toBeInTheDocument();
    });

    it("changes refresh interval when selected", () => {
      render(<PerformanceMonitoringPage />);

      const select = screen.getByLabelText("Refresh Interval");
      fireEvent.change(select, { target: { value: "10000" } });

      expect(select).toHaveValue("10000");
    });

    it("has default value of 5 seconds", () => {
      render(<PerformanceMonitoringPage />);

      const select = screen.getByLabelText("Refresh Interval");
      expect(select).toHaveValue("5000");
    });
  });

  describe("clear metrics button", () => {
    it("renders clear metrics button", () => {
      render(<PerformanceMonitoringPage />);

      expect(screen.getByText("Clear Metrics")).toBeInTheDocument();
    });

    it("calls reset functions when clicked", () => {
      render(<PerformanceMonitoringPage />);

      fireEvent.click(screen.getByText("Clear Metrics"));

      expect(mockReset).toHaveBeenCalled();
      expect(mockClearAlerts).toHaveBeenCalled();
    });
  });

  describe("auto-refresh", () => {
    it("refreshes stats periodically", async () => {
      render(<PerformanceMonitoringPage />);

      const initialCalls = mockGetStats.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(5100);
      });

      // Should have been called at least once more after interval
      expect(mockGetStats.mock.calls.length).toBeGreaterThan(initialCalls);

      const afterFirstInterval = mockGetStats.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should continue refreshing
      expect(mockGetStats.mock.calls.length).toBeGreaterThan(afterFirstInterval);
    });
  });
});
