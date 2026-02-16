/**
 * Tests for Leaderboard component
 * Target: ~20 tests covering leaderboard display and states
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Leaderboard, LeaderboardCompact } from "@/components/gamification/Leaderboard";

// Mock Supabase client
const mockRpc = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock Card components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
}));

describe("Leaderboard", () => {
  const defaultProps = {
    classId: "class-123",
    currentUserId: "user-456",
    limit: 10,
  };

  const mockLeaderboardData = [
    { student_id: "user-1", student_name: "Alice", total_points: 1500, rank: 1 },
    { student_id: "user-2", student_name: "Bob", total_points: 1200, rank: 2 },
    { student_id: "user-456", student_name: "Current User", total_points: 1000, rank: 3 },
    { student_id: "user-4", student_name: "David", total_points: 800, rank: 4 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("should show loading skeleton initially", () => {
      mockRpc.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<Leaderboard {...defaultProps} />);

      // Should show skeleton items
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("data display", () => {
    it("should display leaders after loading", async () => {
      mockRpc.mockResolvedValueOnce({ data: mockLeaderboardData, error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Current User")).toBeInTheDocument();
      expect(screen.getByText("David")).toBeInTheDocument();
    });

    it("should display points correctly", async () => {
      mockRpc.mockResolvedValueOnce({ data: mockLeaderboardData, error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("1,500")).toBeInTheDocument();
      });

      expect(screen.getByText("1,200")).toBeInTheDocument();
      expect(screen.getByText("1,000")).toBeInTheDocument();
    });

    it("should display trophy icons for top 3", async () => {
      mockRpc.mockResolvedValueOnce({ data: mockLeaderboardData, error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("🥇")).toBeInTheDocument();
      });

      expect(screen.getByText("🥈")).toBeInTheDocument();
      expect(screen.getByText("🥉")).toBeInTheDocument();
    });

    it("should display rank number for positions beyond 3", async () => {
      mockRpc.mockResolvedValueOnce({ data: mockLeaderboardData, error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("#4")).toBeInTheDocument();
      });
    });

    it("should highlight current user", async () => {
      mockRpc.mockResolvedValueOnce({ data: mockLeaderboardData, error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("You")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("should show empty state when no leaders", async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No students have earned points yet.")).toBeInTheDocument();
      });

      expect(screen.getByText(/Be the first to complete an assessment/i)).toBeInTheDocument();
    });

    it("should show empty state when data is null", async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No students have earned points yet.")).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("should show error message on fetch failure", async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "Failed" } });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load leaderboard")).toBeInTheDocument();
      });
    });

    it("should show retry button on error", async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "Failed" } });
      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });
    });

    it("should retry fetch when retry button clicked", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: { message: "Failed" } })
        .mockResolvedValueOnce({ data: mockLeaderboardData, error: null });

      render(<Leaderboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Retry"));

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });
    });
  });

  describe("props", () => {
    it("should call RPC with correct classId", async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });
      render(<Leaderboard {...defaultProps} classId="my-class-id" />);

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith("get_class_leaderboard", {
          p_class_id: "my-class-id",
          p_limit: 10,
        });
      });
    });

    it("should use custom limit", async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });
      render(<Leaderboard {...defaultProps} limit={5} />);

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith("get_class_leaderboard", {
          p_class_id: "class-123",
          p_limit: 5,
        });
      });
    });
  });
});

describe("LeaderboardCompact", () => {
  const defaultProps = {
    classId: "class-123",
    currentUserId: "user-456",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it("should render card wrapper", async () => {
    render(<LeaderboardCompact {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });
  });

  it("should render title with trophy icon", async () => {
    render(<LeaderboardCompact {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/🏆 Top Students/)).toBeInTheDocument();
    });
  });

  it("should default to limit of 5", async () => {
    render(<LeaderboardCompact {...defaultProps} />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("get_class_leaderboard", {
        p_class_id: "class-123",
        p_limit: 5,
      });
    });
  });

  it("should accept custom limit", async () => {
    render(<LeaderboardCompact {...defaultProps} limit={3} />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("get_class_leaderboard", {
        p_class_id: "class-123",
        p_limit: 3,
      });
    });
  });
});
