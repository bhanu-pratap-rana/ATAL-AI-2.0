/**
 * Tests for StudentProgressGrid Component
 * Tests real-time student progress display with various states
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Mock client-logger before imports
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Supabase client
const mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: jest.fn() });
const mockOn = jest.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = jest.fn().mockReturnValue({ on: mockOn });
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
    channel: mockChannel,
  }),
}));

// Mock constants
jest.mock("@/lib/constants", () => ({
  TOTAL_CURRICULUM_TOPICS: 50,
}));

import { StudentProgressGrid } from "@/components/teacher/StudentProgressGrid";

describe("StudentProgressGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading skeleton initially", () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        }),
      });

      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      // Should show skeleton cards
      const skeletonCards = document.querySelectorAll(".animate-pulse");
      expect(skeletonCards.length).toBeGreaterThan(0);
    });
  });

  describe("Empty State", () => {
    it("should show message when no students enrolled", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText(/No students enrolled/)).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("should show error message when fetch fails", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load student progress/)).toBeInTheDocument();
      });
    });
  });

  describe("Student Display", () => {
    const mockEnrollments = [
      {
        student_id: "student-1",
        student: [
          {
            id: "student-1",
            email: "alice@example.com",
            raw_user_meta_data: { full_name: "Alice Johnson" },
          },
        ],
      },
      {
        student_id: "student-2",
        student: [
          {
            id: "student-2",
            email: "bob@example.com",
            raw_user_meta_data: { full_name: "Bob Smith" },
          },
        ],
      },
    ];

    const mockProgressData = [
      {
        student_id: "student-1",
        student_name: "Alice Johnson",
        topics_total: 50,
        topics_mastered: 35,
        avg_mastery_score: 75,
        last_activity: new Date().toISOString(),
      },
      {
        student_id: "student-2",
        student_name: "Bob Smith",
        topics_total: 50,
        topics_mastered: 10,
        avg_mastery_score: 30,
        last_activity: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
    ];

    beforeEach(() => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockEnrollments, error: null }),
        }),
      });
      mockRpc.mockResolvedValue({ data: mockProgressData, error: null });
    });

    it("should display student names", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
        expect(screen.getByText("Bob Smith")).toBeInTheDocument();
      });
    });

    it("should display student emails", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      });
    });

    it("should display progress percentage", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        // Alice: 35/50 = 70%
        expect(screen.getByText("70%")).toBeInTheDocument();
        // Bob: 10/50 = 20%
        expect(screen.getByText("20%")).toBeInTheDocument();
      });
    });

    it("should display mastered topics count", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText("35/50")).toBeInTheDocument();
        expect(screen.getByText("10/50")).toBeInTheDocument();
      });
    });

    it("should display average mastery", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText("75%")).toBeInTheDocument();
        expect(screen.getByText("30%")).toBeInTheDocument();
      });
    });

    it("should show at-risk indicator for low-performing students", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        // Bob has low avg_mastery_score (30) so should be at-risk
        expect(screen.getByText(/Needs attention/)).toBeInTheDocument();
      });
    });

    it("should show activity status for recent activity", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        // Alice has recent activity
        expect(screen.getByText(/Active now|h ago/)).toBeInTheDocument();
      });
    });
  });

  describe("Real-time Subscription", () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });
    });

    it("should subscribe to progress changes", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith("class-progress-class-123");
      });
    });

    it("should subscribe to correct table events", async () => {
      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalledWith(
          "postgres_changes",
          expect.objectContaining({
            event: "*",
            schema: "public",
            table: "student_knowledge_state",
          }),
          expect.any(Function)
        );
      });
    });
  });

  describe("Helper Functions", () => {
    it("should use email prefix when no full_name", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                student_id: "student-3",
                student: [
                  {
                    id: "student-3",
                    email: "charlie@example.com",
                    raw_user_meta_data: {}, // No full_name
                  },
                ],
              },
            ],
            error: null,
          }),
        }),
      });
      mockRpc.mockResolvedValue({
        data: [
          {
            student_id: "student-3",
            topics_total: 50,
            topics_mastered: 5,
            avg_mastery_score: 50,
            last_activity: null,
          },
        ],
        error: null,
      });

      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        // Should use email prefix "charlie" as name
        expect(screen.getByText("charlie")).toBeInTheDocument();
      });
    });

    it("should show 'No activity' for students without activity", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                student_id: "student-4",
                student: [
                  {
                    id: "student-4",
                    email: "david@example.com",
                    raw_user_meta_data: { full_name: "David Lee" },
                  },
                ],
              },
            ],
            error: null,
          }),
        }),
      });
      mockRpc.mockResolvedValue({
        data: [
          {
            student_id: "student-4",
            topics_total: 50,
            topics_mastered: 0,
            avg_mastery_score: 0,
            last_activity: null, // No activity
          },
        ],
        error: null,
      });

      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText("No activity")).toBeInTheDocument();
      });
    });
  });

  describe("RPC Error Handling", () => {
    it("should handle RPC error", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                student_id: "student-1",
                student: [
                  {
                    id: "student-1",
                    email: "test@example.com",
                    raw_user_meta_data: { full_name: "Test User" },
                  },
                ],
              },
            ],
            error: null,
          }),
        }),
      });
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      });

      render(
        <StudentProgressGrid classId="class-123" _teacherId="teacher-123" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load student progress/)).toBeInTheDocument();
      });
    });
  });
});
