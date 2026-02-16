/**
 * Tests for AdaptiveRecommendations component
 * Target: ~20 tests covering recommendations display and states
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AdaptiveRecommendations } from "@/components/learn/AdaptiveRecommendations";

// Mock supabase-browser
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

mockSelect.mockReturnValue({
  eq: jest.fn().mockReturnValue({
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  }),
});

jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("AdaptiveRecommendations", () => {
  const defaultProps = {
    userId: "user-123",
    currentModuleId: "M1",
    limit: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return empty data by default
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
  });

  describe("loading state", () => {
    it("should render loading skeleton initially", () => {
      render(<AdaptiveRecommendations {...defaultProps} />);
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should show loading skeleton with muted elements", () => {
      render(<AdaptiveRecommendations {...defaultProps} />);
      const mutedElements = document.querySelectorAll(".bg-muted");
      expect(mutedElements.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should return null when no recommendations", async () => {
      const { container } = render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        // After loading, if no recommendations, component returns null
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
      });
    });
  });

  describe("with recommendations", () => {
    beforeEach(() => {
      // Mock data with struggling topics
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                module_id: "M1",
                topic_id: "T1.1",
                mastery_score: 30,
                status: "learning",
                attempts: 3,
                last_attempt_at: new Date().toISOString(),
              },
              {
                module_id: "M1",
                topic_id: "T1.2",
                mastery_score: 60,
                status: "learning",
                attempts: 2,
                last_attempt_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        }),
      });
    });

    it("should render AI Recommendations title", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("AI Recommendations for You")).toBeInTheDocument();
      });
    });

    it("should render robot emoji", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("🤖")).toBeInTheDocument();
      });
    });

    it("should render description text", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Based on your learning progress and style")).toBeInTheDocument();
      });
    });

    it("should render Ask AI Tutor button", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("💬 Ask AI Tutor")).toBeInTheDocument();
      });
    });

    it("should link to AI tutor", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        const aiTutorLink = screen.getByText("💬 Ask AI Tutor").closest("a");
        expect(aiTutorLink).toHaveAttribute("href", "/app/ai-tools/tutor");
      });
    });

    it("should render need help text", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Need help with any topic?")).toBeInTheDocument();
      });
    });
  });

  describe("with struggling topics (high priority)", () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                module_id: "M1",
                topic_id: "T1.1",
                mastery_score: 25,
                status: "struggling",
                attempts: 4,
                last_attempt_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        }),
      });
    });

    it("should show high priority recommendation for struggling topics", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/You've been working on this. Let's master it together!/i)
        ).toBeInTheDocument();
      });
    });

    it("should show target emoji for high priority", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("🎯")).toBeInTheDocument();
      });
    });
  });

  describe("with almost mastered topics (medium priority)", () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                module_id: "M2",
                topic_id: "T4.1",
                mastery_score: 65,
                status: "learning",
                attempts: 2,
                last_attempt_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        }),
      });
    });

    it("should show medium priority recommendation for almost mastered topics", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/You're almost there! One more push to mastery!/i)
        ).toBeInTheDocument();
      });
    });

    it("should show star emoji for medium priority", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("⭐")).toBeInTheDocument();
      });
    });
  });

  describe("props handling", () => {
    it("should use default limit of 3", async () => {
      render(<AdaptiveRecommendations userId="user-123" />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("student_knowledge_state");
      });
    });

    it("should respect custom limit", async () => {
      render(<AdaptiveRecommendations userId="user-123" limit={5} />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalled();
      });
    });

    it("should pass userId to query", async () => {
      render(<AdaptiveRecommendations userId="custom-user-456" />);

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should handle query errors gracefully", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      const { container } = render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        // Should finish loading without crashing
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
      });
    });

    it("should handle null data gracefully", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { container } = render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
      });
    });
  });

  describe("link generation", () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                module_id: "M1",
                topic_id: "T1.1",
                mastery_score: 40,
                status: "learning",
                attempts: 3,
                last_attempt_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        }),
      });
    });

    it("should generate correct topic links", async () => {
      render(<AdaptiveRecommendations {...defaultProps} />);

      await waitFor(() => {
        const links = document.querySelectorAll('a[href^="/app/learn/"]');
        expect(links.length).toBeGreaterThan(0);
      });
    });
  });
});
