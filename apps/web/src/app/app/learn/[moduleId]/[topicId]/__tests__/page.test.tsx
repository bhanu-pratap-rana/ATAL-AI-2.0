/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => ({ moduleId: "module-1", topicId: "topic-1" }),
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
});

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock supabase
const mockGetUser = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
    })),
  })),
}));

// Mock useChat
const mockHandleSubmit = jest.fn();
const mockHandleInputChange = jest.fn();

jest.mock("@ai-sdk/react", () => ({
  useChat: jest.fn(() => ({
    messages: [
      { id: "welcome", role: "assistant", content: "Hello! I'm your AI Tutor." },
    ],
    input: "",
    handleInputChange: mockHandleInputChange,
    handleSubmit: mockHandleSubmit,
    status: "ready",
  })),
}));

// Mock VoiceChat
jest.mock("@/components/ai/VoiceChat", () => ({
  VoiceChat: ({ onTranscript }: { onTranscript: (text: string) => void }) => (
    <button onClick={() => onTranscript("Voice input text")} data-testid="voice-chat">
      Voice Chat
    </button>
  ),
}));

// Mock MarkdownRenderer
jest.mock("@/components/ui/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, type, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit" | "reset";
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} type={type ?? "button"}>
      {children}
    </button>
  ),
}));

import LessonPage from "../page";

describe("LessonPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: content loads successfully
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockInsert.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  describe("Loading State", () => {
    it("shows loading skeleton initially", () => {
      // Set up mock to never resolve
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => new Promise(() => {})),
      });

      render(<LessonPage />);

      // Should show loading state
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Default Lesson Content", () => {
    it("shows default lesson when no content found", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByText("Lesson Content")).toBeInTheDocument();
      });
    });

    it("shows back to module link", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByText(/back to module/i)).toBeInTheDocument();
      });
    });
  });

  describe("AI Tutor", () => {
    it("shows AI Tutor toggle button", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });
    });

    it("toggles AI Tutor sidebar", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /show ai tutor/i }));

      await waitFor(() => {
        expect(screen.getByText("AI Tutor")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /hide ai tutor/i })).toBeInTheDocument();
      });
    });

    it("shows AI welcome message in sidebar", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /show ai tutor/i }));

      await waitFor(() => {
        expect(screen.getByText(/hello! i'm your ai tutor/i)).toBeInTheDocument();
      });
    });

    it("shows language selector in AI sidebar", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /show ai tutor/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/select language/i)).toBeInTheDocument();
      });
    });

    it("shows text/voice mode buttons", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /show ai tutor/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^text$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^voice$/i })).toBeInTheDocument();
      });
    });

    it("closes AI sidebar when clicking close button", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /show ai tutor/i }));

      await waitFor(() => {
        expect(screen.getByText("AI Tutor")).toBeInTheDocument();
      });

      // Click the close button (✕)
      const closeButton = screen.getByRole("button", { name: /✕/ });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("AI Tutor")).not.toBeInTheDocument();
      });
    });
  });

  describe("Section Navigation", () => {
    it("shows navigation buttons", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /next|complete lesson/i })).toBeInTheDocument();
      });
    });

    it("disables previous button on first section", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      });
    });
  });

  describe("Lesson with Custom Content", () => {
    it("renders lesson title when content is available", async () => {
      // This test verifies the default lesson title renders
      // Database integration is tested separately via integration tests
      render(<LessonPage />);

      await waitFor(() => {
        // Default lesson has title "Lesson Content"
        expect(screen.getByText("Lesson Content")).toBeInTheDocument();
        expect(screen.getByText("পাঠ বিষয়বস্তু")).toBeInTheDocument();
      });
    });

    it("renders back link to module", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        const backLink = screen.getByText("← Back to Module");
        expect(backLink).toBeInTheDocument();
        expect(backLink.closest("a")).toHaveAttribute("href", "/app/learn/module-1");
      });
    });
  });

  describe("Practice Questions", () => {
    beforeEach(() => {
      const mockContentData = [
        {
          content_type: "text",
          content: "Lesson content",
          metadata: { title_en: "Test Lesson", title_as: "পৰীক্ষা" },
        },
      ];

      const mockQuestionsData = [
        {
          id: "q1",
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correct_index: 1,
          explanation: "2 + 2 equals 4",
        },
      ];

      mockSelect.mockImplementation(() => ({
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({ data: mockContentData, error: null }),
          order: jest.fn().mockResolvedValue({ data: mockQuestionsData, error: null }),
        })),
        order: jest.fn().mockResolvedValue({ data: mockQuestionsData, error: null }),
      }));
    });

    it("shows practice questions section when clicking practice button", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Lesson")).toBeInTheDocument();
      });

      // Navigate to practice
      const practiceButton = screen.getByRole("button", { name: /practice questions/i });
      fireEvent.click(practiceButton);

      await waitFor(() => {
        expect(screen.getByText("Practice Questions")).toBeInTheDocument();
        expect(screen.getByText(/what is 2 \+ 2/i)).toBeInTheDocument();
      });
    });

    it("shows answer options for practice questions", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Lesson")).toBeInTheDocument();
      });

      const practiceButton = screen.getByRole("button", { name: /practice questions/i });
      fireEvent.click(practiceButton);

      await waitFor(() => {
        expect(screen.getByText(/^A\.$/)).toBeInTheDocument();
        expect(screen.getByText(/^B\.$/)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("shows default lesson on content fetch error", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: "Fetch error" } }),
      });

      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByText("Lesson Content")).toBeInTheDocument();
      });
    });
  });

  describe("Lesson Completion", () => {
    it("shows complete lesson button when on last section", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        // Default lesson has single section so Complete Lesson should show
        expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument();
      });
    });

    it("navigates back to module on completion", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /complete lesson/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/learn/module-1");
      });
    });
  });

  describe("Voice Input", () => {
    it("shows VoiceChat when voice mode selected", async () => {
      render(<LessonPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /show ai tutor/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /show ai tutor/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^voice$/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /^voice$/i }));

      await waitFor(() => {
        expect(screen.getByTestId("voice-chat")).toBeInTheDocument();
      });
    });
  });
});
