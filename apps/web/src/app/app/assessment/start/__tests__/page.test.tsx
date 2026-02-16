/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AssessmentStartPage from "../page";

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSearchParams = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useSearchParams: () => ({
    get: mockSearchParams,
  }),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock the assessment actions
const mockStartAssessment = jest.fn();
const mockGetAdaptiveQuestions = jest.fn();

jest.mock("@/app/actions/assessment", () => ({
  startAssessment: (...args: unknown[]) => mockStartAssessment(...args),
  getAdaptiveQuestions: (...args: unknown[]) => mockGetAdaptiveQuestions(...args),
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock AssessmentRunner component
jest.mock("@/components/assessment/AssessmentRunner", () => ({
  AssessmentRunner: ({ sessionId, questions }: { sessionId: string; questions: unknown[] }) => (
    <div data-testid="assessment-runner">
      Running session: {sessionId}, Questions: {questions.length}
    </div>
  ),
}));

// Mock AssessmentSkeleton component
jest.mock("@/components/assessment/AssessmentSkeleton", () => ({
  AssessmentSkeleton: () => <div data-testid="assessment-skeleton">Loading...</div>,
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? "Loading..." : children}
    </button>
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

describe("AssessmentStartPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.mockReturnValue(null);
  });

  describe("rendering", () => {
    it("renders the page with title and description", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        expect(screen.getByText("Pre-Assessment")).toBeInTheDocument();
      });
      expect(screen.getByText(/This assessment helps us understand/)).toBeInTheDocument();
    });

    it("renders language selection buttons", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        expect(screen.getByText("English")).toBeInTheDocument();
        expect(screen.getByText("हिंदी")).toBeInTheDocument();
        expect(screen.getByText("অসমীয়া")).toBeInTheDocument();
      });
    });

    it("renders start assessment button", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        expect(screen.getByText("Start Assessment")).toBeInTheDocument();
      });
    });

    it("renders back button", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        expect(screen.getByText("Back")).toBeInTheDocument();
      });
    });

    it("renders info box with expectations", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        expect(screen.getByText("What to expect:")).toBeInTheDocument();
        expect(screen.getByText(/30 questions/)).toBeInTheDocument();
      });
    });
  });

  describe("language selection", () => {
    it("has English selected by default", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        const englishButton = screen.getByText("English").closest("button");
        expect(englishButton).toHaveClass("border-primary");
      });
    });

    it("selects Hindi when clicked", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("हिंदी"));
      });

      const hindiButton = screen.getByText("हिंदी").closest("button");
      expect(hindiButton).toHaveClass("border-primary");
    });

    it("selects Assamese when clicked", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("অসমীয়া"));
      });

      const assameseButton = screen.getByText("অসমীয়া").closest("button");
      expect(assameseButton).toHaveClass("border-primary");
    });
  });

  describe("starting assessment", () => {
    const mockQuestions = [
      { id: "q1", itemCode: "Q1", category: "basics", questionNumber: 1, questionText: "Test question?", options: [{ id: "a", text: "A" }], _correctIndex: 0, _difficulty: 1, _discrimination: 1, _guessing: 0.25 },
    ];

    it("starts assessment with selected language", async () => {
      mockStartAssessment.mockResolvedValue({ success: true, sessionId: "session-123" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: true, questions: mockQuestions });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(mockStartAssessment).toHaveBeenCalled();
        expect(mockGetAdaptiveQuestions).toHaveBeenCalledWith("en");
      });
    });

    it("passes classId to startAssessment when provided in URL", async () => {
      mockSearchParams.mockReturnValue("class-456");
      mockStartAssessment.mockResolvedValue({ success: true, sessionId: "session-123" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: true, questions: mockQuestions });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(mockStartAssessment).toHaveBeenCalledWith("class-456");
      });
    });

    it("shows AssessmentRunner after successful start", async () => {
      mockStartAssessment.mockResolvedValue({ success: true, sessionId: "session-123" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: true, questions: mockQuestions });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByTestId("assessment-runner")).toBeInTheDocument();
        expect(screen.getByText(/Running session: session-123/)).toBeInTheDocument();
      });
    });

    it("shows error when startAssessment fails", async () => {
      mockStartAssessment.mockResolvedValue({ success: false, error: "Session creation failed" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: true, questions: mockQuestions });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByText("Session creation failed")).toBeInTheDocument();
      });
    });

    it("shows error when getAdaptiveQuestions fails", async () => {
      mockStartAssessment.mockResolvedValue({ success: true, sessionId: "session-123" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: false, error: "Failed to load questions" });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to load questions")).toBeInTheDocument();
      });
    });

    it("shows error when questions array is empty", async () => {
      mockStartAssessment.mockResolvedValue({ success: true, sessionId: "session-123" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: true, questions: [] });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to load questions")).toBeInTheDocument();
      });
    });

    it("handles exception during start", async () => {
      mockStartAssessment.mockRejectedValue(new Error("Network error"));

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("handles non-Error exception", async () => {
      mockStartAssessment.mockRejectedValue("String error");

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("error dismissal", () => {
    it("can dismiss error by clicking dismiss button", async () => {
      mockStartAssessment.mockResolvedValue({ success: false, error: "Error message" });
      mockGetAdaptiveQuestions.mockResolvedValue({ success: true, questions: [] });

      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Start Assessment"));
      });

      await waitFor(() => {
        expect(screen.getByText("Error message")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Dismiss"));

      await waitFor(() => {
        expect(screen.queryByText("Error message")).not.toBeInTheDocument();
      });
    });
  });

  describe("back button", () => {
    it("calls router.back when clicked", async () => {
      render(<AssessmentStartPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByText("Back"));
      });

      expect(mockBack).toHaveBeenCalled();
    });
  });
});
