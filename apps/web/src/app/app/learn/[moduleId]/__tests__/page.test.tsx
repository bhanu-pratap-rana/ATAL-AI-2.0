/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ModuleTopicsPage from "../page";

// Mock next/navigation
const mockRedirect = jest.fn();
const mockNotFound = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    mockNotFound();
    throw new Error("NOT_FOUND");
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link">{children}</a>
  );
});

// Mock supabase-server
const mockGetCurrentUser = jest.fn();
const mockSelectKnowledgeState = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createClient: jest.fn().mockImplementation(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => mockSelectKnowledgeState(),
        }),
      }),
    }),
  })),
}));

// Mock LessonPreCacher
jest.mock("@/components/offline/LessonPreCacher", () => ({
  LessonPreCacher: () => <div data-testid="lesson-pre-cacher" />,
  DownloadModuleButton: ({ moduleName }: { moduleName: string }) => (
    <button data-testid="download-button">Download {moduleName}</button>
  ),
}));

// Mock UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

describe("ModuleTopicsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    mockSelectKnowledgeState.mockResolvedValue({ data: [] });
  });

  describe("authentication", () => {
    it("redirects to student/start when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(
        ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) })
      ).rejects.toThrow("REDIRECT:/student/start");

      expect(mockRedirect).toHaveBeenCalledWith("/student/start");
    });
  });

  describe("invalid module", () => {
    it("throws notFound for invalid moduleId", async () => {
      await expect(
        ModuleTopicsPage({ params: Promise.resolve({ moduleId: "INVALID" }) })
      ).rejects.toThrow("NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });
  });

  describe("Module M1 - Computer Basics", () => {
    it("renders module header", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("Computer Basics")).toBeInTheDocument();
      expect(screen.getByText("কম্পিউটাৰ মূল কথা")).toBeInTheDocument();
      expect(screen.getByText("💻")).toBeInTheDocument();
    });

    it("renders back to learning path link", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("← Back to Learning Path")).toBeInTheDocument();
    });

    it("renders download button", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByTestId("download-button")).toHaveTextContent("Download Computer Basics");
    });

    it("renders all 10 topics", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("The Four Jobs of a Computer")).toBeInTheDocument();
      expect(screen.getByText("Main Parts You See and Use")).toBeInTheDocument();
      expect(screen.getByText("RAM vs Storage")).toBeInTheDocument();
      expect(screen.getByText("10 topics")).toBeInTheDocument();
    });

    it("renders topic descriptions", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("Input → Processing → Output → Storage")).toBeInTheDocument();
    });

    it("renders topic durations", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getAllByText(/15 min/).length).toBeGreaterThan(0);
    });

    it("renders lesson pre-cacher component", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByTestId("lesson-pre-cacher")).toBeInTheDocument();
    });
  });

  describe("Module M2 - Operating Systems", () => {
    it("renders module header", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M2" }) });
      render(Component);

      expect(screen.getByText("Operating Systems")).toBeInTheDocument();
      expect(screen.getByText("অপাৰেটিং চিষ্টেম")).toBeInTheDocument();
      expect(screen.getByText("🖥️")).toBeInTheDocument();
    });

    it("renders OS-specific topics", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M2" }) });
      render(Component);

      expect(screen.getByText("Understanding the Desktop")).toBeInTheDocument();
      expect(screen.getByText("Window Management")).toBeInTheDocument();
    });
  });

  describe("Module M3 - Internet Basics", () => {
    it("renders module header", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M3" }) });
      render(Component);

      expect(screen.getByText("Internet Basics")).toBeInTheDocument();
      expect(screen.getByText("🌐")).toBeInTheDocument();
    });
  });

  describe("Module M4 - Digital Communication", () => {
    it("renders module header", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M4" }) });
      render(Component);

      expect(screen.getByText("Digital Communication")).toBeInTheDocument();
      expect(screen.getByText("📧")).toBeInTheDocument();
    });
  });

  describe("Module M5 - Local Technology", () => {
    it("renders module header", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M5" }) });
      render(Component);

      expect(screen.getByText("Local Technology")).toBeInTheDocument();
      expect(screen.getByText("🏔️")).toBeInTheDocument();
    });
  });

  describe("topic progress", () => {
    it("shows completed topics count", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 80, status: "mastered", attempts: 2, last_attempt_at: new Date().toISOString() },
          { topic_id: "T1.2", mastery_score: 75, status: "mastered", attempts: 1, last_attempt_at: new Date().toISOString() },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("2/10 complete")).toBeInTheDocument();
    });

    it("shows checkmark for completed topics (70%+ mastery)", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 85, status: "mastered", attempts: 1, last_attempt_at: null },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("shows mastery percentage for topics with progress", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 65, status: "in_progress", attempts: 1, last_attempt_at: null },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("65%")).toBeInTheDocument();
    });

    it("applies completed border style to completed topics", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 80, status: "mastered", attempts: 1, last_attempt_at: null },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      // The first topic card should have completed styling
      const cards = screen.getAllByTestId("card");
      const topicCard = cards.find(card => card.className?.includes("border-success"));
      expect(topicCard).toBeTruthy();
    });
  });

  describe("progress bar colors", () => {
    it("shows success color for high mastery (70%+)", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 85, status: "mastered", attempts: 1, last_attempt_at: null },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("85%")).toHaveClass("text-success");
    });

    it("shows warning color for medium mastery (40-69%)", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 55, status: "in_progress", attempts: 1, last_attempt_at: null },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("55%")).toHaveClass("text-warning");
    });

    it("shows error color for low mastery (<40%)", async () => {
      mockSelectKnowledgeState.mockResolvedValue({
        data: [
          { topic_id: "T1.1", mastery_score: 25, status: "in_progress", attempts: 1, last_attempt_at: null },
        ],
      });

      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      expect(screen.getByText("25%")).toHaveClass("text-error");
    });
  });

  describe("topic links", () => {
    it("creates correct links to topic pages", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      const links = screen.getAllByTestId("link");
      const topicLink = links.find(link => link.getAttribute("href")?.includes("/app/learn/M1/T1.1"));
      expect(topicLink).toBeTruthy();
    });
  });

  describe("total duration calculation", () => {
    it("calculates total minutes correctly for M1", async () => {
      const Component = await ModuleTopicsPage({ params: Promise.resolve({ moduleId: "M1" }) });
      render(Component);

      // M1 topics: 15+20+15+15+15+15+15+20+15+20 = 165 minutes
      expect(screen.getByText("165 minutes")).toBeInTheDocument();
    });
  });
});
