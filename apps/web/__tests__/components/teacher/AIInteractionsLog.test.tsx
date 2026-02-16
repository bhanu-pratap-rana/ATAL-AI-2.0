/**
 * Tests for AIInteractionsLog component
 * Target: ~15 tests covering loading, empty states, and interactions display
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIInteractionsLog } from "@/components/teacher/AIInteractionsLog";

// Mock Supabase client
const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn(() => ({ unsubscribe: mockUnsubscribe }));
const mockOn = jest.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = jest.fn(() => ({ on: mockOn }));

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

mockSelect.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder, limit: mockLimit });
mockEq.mockReturnValue({ select: mockSelect, eq: mockEq, in: mockIn });
mockIn.mockReturnValue({ order: mockOrder });
mockOrder.mockReturnValue({ limit: mockLimit });
mockLimit.mockResolvedValue({ data: [], error: null });

jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    from: mockFrom,
    channel: mockChannel,
  }),
}));

describe("AIInteractionsLog", () => {
  const defaultProps = {
    classId: "class-123",
    limit: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock chain
    mockSelect.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder, limit: mockLimit });
    mockEq.mockReturnValue({ select: mockSelect, eq: mockEq, in: mockIn });
    mockIn.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
  });

  describe("loading state", () => {
    it("should show loading skeletons initially", () => {
      mockLimit.mockReturnValue(new Promise(() => {})); // Never resolves
      const { container } = render(<AIInteractionsLog {...defaultProps} />);

      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should show empty message when no students enrolled", async () => {
      // First query for enrollments returns empty
      mockEq.mockResolvedValueOnce({ data: [], error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No AI tutor interactions yet.")).toBeInTheDocument();
      });
    });

    it("should show empty message when no interactions exist", async () => {
      // First query for enrollments
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      // Second query for interactions returns empty
      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No AI tutor interactions yet.")).toBeInTheDocument();
      });
    });

    it("should show helper text in empty state", async () => {
      mockEq.mockResolvedValueOnce({ data: [], error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("Interactions will appear here when students use the AI tutor.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("should show error message when fetch fails", async () => {
      mockEq.mockRejectedValueOnce(new Error("Database error"));

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load AI interactions")).toBeInTheDocument();
      });
    });
  });

  describe("interactions display", () => {
    const mockInteractions = [
      {
        id: "int-1",
        student_id: "student-1",
        session_id: "session-1",
        topic_id: "topic-1",
        message_role: "user",
        message_content: "What is photosynthesis?",
        input_mode: "text",
        language: "en",
        tokens_used: 100,
        response_time_ms: 500,
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: "int-2",
        student_id: "student-1",
        session_id: "session-1",
        topic_id: "topic-1",
        message_role: "assistant",
        message_content: "Photosynthesis is the process by which plants convert light energy into chemical energy.",
        input_mode: "text",
        language: "en",
        tokens_used: 200,
        response_time_ms: 1000,
        created_at: "2024-01-15T10:00:05Z",
      },
    ];

    it("should display session cards when interactions exist", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: mockInteractions, error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/What is photosynthesis\?/)).toBeInTheDocument();
      });
    });

    it("should show message count and token count", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: mockInteractions, error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/2 messages/)).toBeInTheDocument();
        expect(screen.getByText(/300 tokens/)).toBeInTheDocument();
      });
    });

    it("should expand session on click", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: mockInteractions, error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/What is photosynthesis\?/)).toBeInTheDocument();
      });

      // Click to expand
      const sessionHeader = screen.getByRole("button", {
        name: /Expand conversation/i,
      });
      fireEvent.click(sessionHeader);

      await waitFor(() => {
        expect(screen.getByText("🧑‍🎓 Student")).toBeInTheDocument();
      });
    });

    it("should show collapse button after expanding", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: mockInteractions, error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/What is photosynthesis\?/)).toBeInTheDocument();
      });

      const sessionHeader = screen.getByRole("button", {
        name: /Expand conversation/i,
      });
      fireEvent.click(sessionHeader);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Collapse conversation/i })
        ).toBeInTheDocument();
      });
    });

    it("should handle keyboard navigation (Enter key)", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: mockInteractions, error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/What is photosynthesis\?/)).toBeInTheDocument();
      });

      const sessionHeader = screen.getByRole("button", {
        name: /Expand conversation/i,
      });
      fireEvent.keyDown(sessionHeader, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("🧑‍🎓 Student")).toBeInTheDocument();
      });
    });

    it("should handle keyboard navigation (Space key)", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: mockInteractions, error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/What is photosynthesis\?/)).toBeInTheDocument();
      });

      const sessionHeader = screen.getByRole("button", {
        name: /Expand conversation/i,
      });
      fireEvent.keyDown(sessionHeader, { key: " " });

      await waitFor(() => {
        expect(screen.getByText("🧑‍🎓 Student")).toBeInTheDocument();
      });
    });
  });

  describe("subscription", () => {
    it("should set up subscription channel on mount", async () => {
      mockEq.mockResolvedValueOnce({ data: [], error: null });

      render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith("ai-interactions-class-123");
      });
    });

    it("should unsubscribe on unmount", async () => {
      mockEq.mockResolvedValueOnce({ data: [], error: null });

      const { unmount } = render(<AIInteractionsLog {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("default props", () => {
    it("should use default limit of 20", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ student_id: "student-1" }],
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      render(<AIInteractionsLog classId="class-123" />);

      await waitFor(() => {
        expect(mockLimit).toHaveBeenCalledWith(20);
      });
    });
  });
});
