/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AITutorPage from "../page";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock useRequireAuth hook
const mockUseRequireAuth = jest.fn();
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: (...args: unknown[]) => mockUseRequireAuth(...args),
}));

// Mock ai/react useChat hook
const mockHandleSubmit = jest.fn((e?: React.FormEvent) => e?.preventDefault());
const mockHandleInputChange = jest.fn();
const mockUseChat = jest.fn();

jest.mock("ai/react", () => ({
  useChat: () => mockUseChat(),
}));

// Mock VoiceChat component
jest.mock("@/components/voice/VoiceChat", () => ({
  VoiceChat: ({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) => (
    <div data-testid="voice-chat">
      <button
        data-testid="voice-record-btn"
        disabled={disabled}
        onClick={() => onTranscript("Voice input text")}
      >
        Record Voice
      </button>
    </div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...props}>{children}</h3>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}));

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn().mockReturnValue("test-session-uuid");
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: mockRandomUUID },
});

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

describe("AITutorPage", () => {
  const defaultUseChatReturn = {
    messages: [],
    input: "",
    handleInputChange: mockHandleInputChange,
    handleSubmit: mockHandleSubmit,
    status: "idle",
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequireAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockUseChat.mockReturnValue(defaultUseChatReturn);
  });

  describe("loading state", () => {
    it("shows loading state while checking auth", () => {
      mockUseRequireAuth.mockReturnValue({ user: null, loading: true });

      render(<AITutorPage />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("rendering", () => {
    it("renders the page title", () => {
      render(<AITutorPage />);

      expect(screen.getByText("💬 AI Tutor")).toBeInTheDocument();
    });

    it("renders back link to AI tools", () => {
      render(<AITutorPage />);

      expect(screen.getByText("← Back to AI Tools")).toBeInTheDocument();
    });

    it("renders language selector buttons", () => {
      render(<AITutorPage />);

      expect(screen.getByText("English")).toBeInTheDocument();
      expect(screen.getByText("हिंदी")).toBeInTheDocument();
      expect(screen.getByText("অসমীয়া")).toBeInTheDocument();
    });

    it("renders input mode toggle", () => {
      render(<AITutorPage />);

      expect(screen.getByText("📝 Text")).toBeInTheDocument();
      expect(screen.getByText("🎤 Voice")).toBeInTheDocument();
    });

    it("renders tips section", () => {
      render(<AITutorPage />);

      expect(screen.getByText("💡 Tips for better answers")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows start conversation prompt when no messages", () => {
      render(<AITutorPage />);

      expect(screen.getByText("Start a conversation with your AI tutor!")).toBeInTheDocument();
    });

    it("shows suggested questions", () => {
      render(<AITutorPage />);

      expect(screen.getByText("What is a computer?")).toBeInTheDocument();
      expect(screen.getByText("How does the internet work?")).toBeInTheDocument();
      expect(screen.getByText("What is email?")).toBeInTheDocument();
      expect(screen.getByText("How to stay safe online?")).toBeInTheDocument();
    });

    it("clicking suggested question fills input", () => {
      render(<AITutorPage />);

      fireEvent.click(screen.getByText("What is a computer?"));

      expect(mockHandleInputChange).toHaveBeenCalled();
    });
  });

  describe("language selection", () => {
    it("has English selected by default", () => {
      render(<AITutorPage />);

      const englishButton = screen.getByText("English");
      expect(englishButton.closest("button")).toHaveClass("bg-primary");
    });

    it("selects Hindi when clicked", () => {
      render(<AITutorPage />);

      fireEvent.click(screen.getByText("हिंदी"));

      const hindiButton = screen.getByText("हिंदी");
      expect(hindiButton.closest("button")).toHaveClass("bg-primary");
    });

    it("selects Assamese when clicked", () => {
      render(<AITutorPage />);

      fireEvent.click(screen.getByText("অসমীয়া"));

      const assameseButton = screen.getByText("অসমীয়া");
      expect(assameseButton.closest("button")).toHaveClass("bg-primary");
    });
  });

  describe("input mode toggle", () => {
    it("has text mode selected by default", () => {
      render(<AITutorPage />);

      const textButton = screen.getByText("📝 Text");
      expect(textButton.closest("button")).toHaveClass("bg-primary");
    });

    it("switches to voice mode when clicked", () => {
      render(<AITutorPage />);

      fireEvent.click(screen.getByText("🎤 Voice"));

      expect(screen.getByTestId("voice-chat")).toBeInTheDocument();
    });

    it("shows text input in text mode", () => {
      render(<AITutorPage />);

      expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
    });

    it("shows VoiceChat component in voice mode", () => {
      render(<AITutorPage />);

      fireEvent.click(screen.getByText("🎤 Voice"));

      expect(screen.getByTestId("voice-chat")).toBeInTheDocument();
    });
  });

  describe("messages display", () => {
    it("renders user messages", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        messages: [
          { id: "1", role: "user", content: "Hello AI" },
        ],
      });

      render(<AITutorPage />);

      expect(screen.getByText("Hello AI")).toBeInTheDocument();
    });

    it("renders assistant messages", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        messages: [
          { id: "1", role: "assistant", content: "Hello! How can I help you?" },
        ],
      });

      render(<AITutorPage />);

      expect(screen.getByText("Hello! How can I help you?")).toBeInTheDocument();
    });

    it("renders multiple messages in order", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        messages: [
          { id: "1", role: "user", content: "Question 1" },
          { id: "2", role: "assistant", content: "Answer 1" },
          { id: "3", role: "user", content: "Question 2" },
        ],
      });

      render(<AITutorPage />);

      expect(screen.getByText("Question 1")).toBeInTheDocument();
      expect(screen.getByText("Answer 1")).toBeInTheDocument();
      expect(screen.getByText("Question 2")).toBeInTheDocument();
    });
  });

  describe("loading state during chat", () => {
    it("shows loading indicator when status is submitted", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        messages: [{ id: "1", role: "user", content: "Hello" }],
        status: "submitted",
      });

      render(<AITutorPage />);

      // Loading dots should be visible - check for the bounce animation class
      const loadingDots = document.querySelectorAll(".animate-bounce");
      expect(loadingDots.length).toBe(3);
    });

    it("shows loading indicator when status is streaming", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        messages: [{ id: "1", role: "user", content: "Hello" }],
        status: "streaming",
      });

      render(<AITutorPage />);

      const loadingDots = document.querySelectorAll(".animate-bounce");
      expect(loadingDots.length).toBe(3);
    });

    it("disables input while loading", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        status: "submitted",
      });

      render(<AITutorPage />);

      expect(screen.getByPlaceholderText("Ask a question...")).toBeDisabled();
    });

    it("disables send button while loading", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        status: "submitted",
      });

      render(<AITutorPage />);

      expect(screen.getByText("Sending...")).toBeDisabled();
    });
  });

  describe("error display", () => {
    it("shows error message when error occurs", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: { message: "API rate limit exceeded" },
      });

      render(<AITutorPage />);

      expect(screen.getByText(/API rate limit exceeded/)).toBeInTheDocument();
    });

    it("shows default error message when error has no message", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: {},
      });

      render(<AITutorPage />);

      expect(screen.getByText(/An error occurred. Please try again./)).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls handleSubmit when form is submitted", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        input: "My question",
      });

      render(<AITutorPage />);

      const form = screen.getByPlaceholderText("Ask a question...").closest("form");
      fireEvent.submit(form!);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it("calls handleInputChange when input changes", () => {
      render(<AITutorPage />);

      fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
        target: { value: "Test input" },
      });

      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it("disables send button when input is empty", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        input: "",
      });

      render(<AITutorPage />);

      expect(screen.getByText("Send")).toBeDisabled();
    });

    it("disables send button when input is only whitespace", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        input: "   ",
      });

      render(<AITutorPage />);

      expect(screen.getByText("Send")).toBeDisabled();
    });

    it("enables send button when input has content", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        input: "My question",
      });

      render(<AITutorPage />);

      expect(screen.getByText("Send")).not.toBeDisabled();
    });
  });

  describe("voice input", () => {
    it("voice chat receives onTranscript callback", () => {
      render(<AITutorPage />);

      fireEvent.click(screen.getByText("🎤 Voice"));

      const voiceButton = screen.getByTestId("voice-record-btn");
      fireEvent.click(voiceButton);

      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it("disables voice chat when loading", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        status: "submitted",
      });

      render(<AITutorPage />);

      fireEvent.click(screen.getByText("🎤 Voice"));

      expect(screen.getByTestId("voice-record-btn")).toBeDisabled();
    });
  });

  describe("session management", () => {
    it("generates a session ID on mount", () => {
      render(<AITutorPage />);

      expect(mockRandomUUID).toHaveBeenCalled();
    });
  });
});
