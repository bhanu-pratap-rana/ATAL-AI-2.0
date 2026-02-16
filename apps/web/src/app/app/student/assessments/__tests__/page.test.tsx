/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import StudentAssessmentsPage from "../page";

// Mock next/navigation
const mockRedirect = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`REDIRECT:${path}`);
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock supabase-server
const mockGetUser = jest.fn();
const mockSelectSessions = jest.fn();
const mockSelectResponses = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn().mockImplementation(async () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      if (table === "assessment_sessions") {
        return {
          select: () => ({
            eq: () => ({
              not: () => ({
                order: () => mockSelectSessions(),
              }),
            }),
          }),
        };
      }
      if (table === "assessment_responses") {
        return {
          select: () => ({
            eq: () => mockSelectResponses(),
          }),
        };
      }
      return {};
    },
  })),
}));

// Mock UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...props}>{children}</h3>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

describe("StudentAssessmentsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSelectSessions.mockResolvedValue({ data: [] });
    mockSelectResponses.mockResolvedValue({ data: [] });
  });

  describe("authentication", () => {
    it("redirects to student/start when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(StudentAssessmentsPage()).rejects.toThrow("REDIRECT:/student/start");
      expect(mockRedirect).toHaveBeenCalledWith("/student/start");
    });
  });

  describe("empty state", () => {
    it("shows empty state when no assessments completed", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("📚")).toBeInTheDocument();
      expect(screen.getByText("No assessments completed yet")).toBeInTheDocument();
      expect(screen.getByText("Take Your First Assessment")).toBeInTheDocument();
    });
  });

  describe("rendering", () => {
    it("renders page title", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("📝 Assessments")).toBeInTheDocument();
    });

    it("renders back link to dashboard", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument();
    });

    it("renders start new assessment card", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("Start a New Assessment")).toBeInTheDocument();
      expect(screen.getByText("Start Assessment")).toBeInTheDocument();
    });

    it("renders assessment history heading", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("📊")).toBeInTheDocument();
      expect(screen.getByText("Assessment History")).toBeInTheDocument();
    });
  });

  describe("with assessment history", () => {
    const mockSessions = [
      {
        id: "session-1",
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      },
      {
        id: "session-2",
        started_at: new Date(Date.now() - 86400000).toISOString(),
        submitted_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const mockResponses = [
      { is_correct: true, rt_ms: 5000 },
      { is_correct: true, rt_ms: 3000 },
      { is_correct: false, rt_ms: 4000 },
      { is_correct: true, rt_ms: 2000 },
    ];

    beforeEach(() => {
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({ data: mockResponses });
    });

    it("renders assessment cards with score", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      // Multiple assessments rendered, so use getAllByText
      const assessmentTitles = screen.getAllByText("Digital Literacy Assessment");
      expect(assessmentTitles.length).toBeGreaterThan(0);
      const scores = screen.getAllByText("75%");
      expect(scores.length).toBeGreaterThan(0);
    });

    it("renders skill level badge", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      // Multiple intermediate badges expected
      const badges = screen.getAllByText("Intermediate");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows view details button for each assessment", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      const viewDetailsButtons = screen.getAllByText("View Details");
      expect(viewDetailsButtons.length).toBeGreaterThan(0);
    });

    it("shows completed count in history heading", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText(/completed/)).toBeInTheDocument();
    });

    it("renders stats summary cards", async () => {
      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("Total Attempts")).toBeInTheDocument();
      expect(screen.getByText("Average Score")).toBeInTheDocument();
      expect(screen.getByText("Best Score")).toBeInTheDocument();
      expect(screen.getByText("Passed (60%+)")).toBeInTheDocument();
    });
  });

  describe("score calculations", () => {
    it("correctly calculates average score", async () => {
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
          { is_correct: false, rt_ms: 1000 },
        ],
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      // Multiple 80% values may appear (in score circle and stats)
      const scores = screen.getAllByText("80%");
      expect(scores.length).toBeGreaterThan(0);
    });

    it("shows Advanced skill level for 80%+ scores", async () => {
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
          { is_correct: true, rt_ms: 1000 },
        ],
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("shows Beginner skill level for scores under 60%", async () => {
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [
          { is_correct: true, rt_ms: 1000 },
          { is_correct: false, rt_ms: 1000 },
          { is_correct: false, rt_ms: 1000 },
          { is_correct: false, rt_ms: 1000 },
          { is_correct: false, rt_ms: 1000 },
        ],
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("Beginner")).toBeInTheDocument();
    });
  });

  describe("time formatting", () => {
    it("formats seconds correctly", async () => {
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [
          { is_correct: true, rt_ms: 30000 }, // 30 seconds
        ],
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText(/30s/)).toBeInTheDocument();
    });

    it("formats minutes correctly", async () => {
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [
          { is_correct: true, rt_ms: 90000 }, // 90 seconds = 1m 30s
        ],
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText(/1m 30s/)).toBeInTheDocument();
    });
  });
});

// Test helper functions
describe("Helper functions behavior", () => {
  describe("formatTime", () => {
    it("shows only seconds for times under 60s", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [{ is_correct: true, rt_ms: 45000 }], // 45 seconds
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText(/45s/)).toBeInTheDocument();
    });

    it("shows minutes only when no remaining seconds", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [{ is_correct: true, rt_ms: 120000 }], // 120 seconds = 2m
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText(/2m$/)).toBeInTheDocument();
    });
  });

  describe("formatRelativeTime", () => {
    it("shows Today for today's assessments", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });
      const mockSessions = [
        { id: "s1", started_at: new Date().toISOString(), submitted_at: new Date().toISOString() },
      ];
      mockSelectSessions.mockResolvedValue({ data: mockSessions });
      mockSelectResponses.mockResolvedValue({
        data: [{ is_correct: true, rt_ms: 1000 }],
      });

      const Component = await StudentAssessmentsPage();
      render(Component);

      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });
});
