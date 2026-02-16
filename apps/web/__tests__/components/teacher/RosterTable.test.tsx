/**
 * Tests for RosterTable component
 * Target: ~18 tests covering rendering, student removal, and edge cases
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RosterTable } from "@/components/teacher/RosterTable";

// Mock toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

// Mock Next.js router
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock removeStudent action
const mockRemoveStudent = jest.fn();
jest.mock("@/app/actions/teacher", () => ({
  removeStudent: (...args: unknown[]) => mockRemoveStudent(...args),
}));

// Mock window.confirm
const originalConfirm = window.confirm;

describe("RosterTable", () => {
  const mockEnrollments = [
    {
      id: "enrollment-1",
      created_at: "2024-01-15T10:00:00Z",
      student_id: "student-1",
      student: {
        user_id: "student-1",
        name: "Alice Smith",
        phone: "+91987654321",
        roll_number: "101",
        class_name: "10A",
      },
    },
    {
      id: "enrollment-2",
      created_at: "2024-01-16T11:00:00Z",
      student_id: "student-2",
      student: {
        user_id: "student-2",
        name: "Bob Jones",
        phone: null,
        roll_number: "102",
        class_name: "10A",
      },
    },
    {
      id: "enrollment-3",
      created_at: "2024-01-17T12:00:00Z",
      student_id: "student-3",
      student: null,
    },
  ];

  const defaultProps = {
    enrollments: mockEnrollments,
    classId: "class-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    mockRemoveStudent.mockResolvedValue({ success: true });
  });

  afterAll(() => {
    window.confirm = originalConfirm;
  });

  describe("rendering", () => {
    it("should render table with proper accessibility label", () => {
      render(<RosterTable {...defaultProps} />);

      expect(
        screen.getByRole("table", {
          name: "Class roster with student enrollment information",
        })
      ).toBeInTheDocument();
    });

    it("should render all column headers", () => {
      render(<RosterTable {...defaultProps} />);

      expect(screen.getByText("Student")).toBeInTheDocument();
      expect(screen.getByText("Roll No.")).toBeInTheDocument();
      expect(screen.getByText("Class")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText("Enrolled")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("should render student names", () => {
      render(<RosterTable {...defaultProps} />);

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    it("should render fallback name for student without name", () => {
      render(<RosterTable {...defaultProps} />);

      // Student 3 has no student info, should show "Student student-3" (first 8 chars)
      expect(screen.getByText(/Student student-/)).toBeInTheDocument();
    });

    it("should render student initials", () => {
      render(<RosterTable {...defaultProps} />);

      expect(screen.getByText("A")).toBeInTheDocument(); // Alice
      expect(screen.getByText("B")).toBeInTheDocument(); // Bob
      expect(screen.getByText("S")).toBeInTheDocument(); // Fallback for null student
    });

    it("should render roll numbers", () => {
      render(<RosterTable {...defaultProps} />);

      expect(screen.getByText("101")).toBeInTheDocument();
      expect(screen.getByText("102")).toBeInTheDocument();
    });

    it("should render dash for missing roll number", () => {
      const enrollments = [
        {
          id: "e1",
          created_at: "2024-01-15T10:00:00Z",
          student_id: "s1",
          student: {
            user_id: "s1",
            name: "Test",
            phone: null,
            roll_number: null,
            class_name: null,
          },
        },
      ];
      render(<RosterTable enrollments={enrollments} classId="class-1" />);

      // Multiple dashes may appear, just check they exist
      const cells = screen.getAllByText("-");
      expect(cells.length).toBeGreaterThan(0);
    });

    it("should render formatted enrollment date", () => {
      render(<RosterTable {...defaultProps} />);

      // Should show dates in format like "Jan 15, 2024"
      expect(screen.getAllByText(/Jan \d+, 2024/).length).toBeGreaterThan(0);
    });

    it("should render remove buttons for each student", () => {
      render(<RosterTable {...defaultProps} />);

      const removeButtons = screen.getAllByRole("button", { name: /Remove .* from class/i });
      expect(removeButtons).toHaveLength(3);
    });
  });

  describe("student removal", () => {
    it("should show confirmation dialog when remove is clicked", () => {
      window.confirm = jest.fn(() => false);
      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      expect(window.confirm).toHaveBeenCalledWith(
        "Remove Alice Smith from this class?"
      );
    });

    it("should not proceed if confirmation is cancelled", async () => {
      window.confirm = jest.fn(() => false);
      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      expect(mockRemoveStudent).not.toHaveBeenCalled();
    });

    it("should call removeStudent with correct parameters on confirm", async () => {
      window.confirm = jest.fn(() => true);
      mockRemoveStudent.mockResolvedValue({ success: true });

      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockRemoveStudent).toHaveBeenCalledWith("class-123", "student-1");
      });
    });

    it("should show success toast on successful removal", async () => {
      window.confirm = jest.fn(() => true);
      mockRemoveStudent.mockResolvedValue({ success: true });

      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Student removed successfully");
      });
    });

    it("should refresh router on successful removal", async () => {
      window.confirm = jest.fn(() => true);
      mockRemoveStudent.mockResolvedValue({ success: true });

      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should show error toast when removal fails", async () => {
      window.confirm = jest.fn(() => true);
      mockRemoveStudent.mockResolvedValue({ success: false, error: "Not authorized" });

      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Not authorized");
      });
    });

    it("should show generic error toast when removal throws", async () => {
      window.confirm = jest.fn(() => true);
      mockRemoveStudent.mockRejectedValue(new Error("Network error"));

      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("An unexpected error occurred");
      });
    });

    it("should show 'Removing...' during removal process", async () => {
      window.confirm = jest.fn(() => true);
      // Create a promise that we can control
      let resolveRemove: (value: { success: boolean }) => void;
      const removePromise = new Promise<{ success: boolean }>((resolve) => {
        resolveRemove = resolve;
      });
      mockRemoveStudent.mockReturnValue(removePromise);

      render(<RosterTable {...defaultProps} />);

      const removeButton = screen.getByRole("button", {
        name: /Remove Alice Smith from class/i,
      });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText("Removing...")).toBeInTheDocument();
      });

      // Resolve the promise
      resolveRemove!({ success: true });
    });
  });
});
