/**
 * Tests for InviteStudentDialog component
 * Target: ~20 tests covering rendering, search, and enrollment
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InviteStudentDialog } from "@/components/teacher/InviteStudentDialog";

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

// Mock enrollStudent action
const mockEnrollStudent = jest.fn();
jest.mock("@/app/actions/teacher", () => ({
  enrollStudent: (...args: unknown[]) => mockEnrollStudent(...args),
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock Dialog components
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

// Mock StudentSearchResults
jest.mock("@/components/teacher/StudentSearchResults", () => ({
  StudentSearchResults: ({
    results,
    selectedStudent,
    onSelectStudent,
    isLoading,
  }: {
    results: Array<{ id: string; email: string }>;
    selectedStudent: { id: string; email: string } | null;
    onSelectStudent: (student: { id: string; email: string }) => void;
    isLoading: boolean;
  }) => (
    <div data-testid="student-search-results">
      {results.map((student) => (
        <button
          key={student.id}
          onClick={() => onSelectStudent(student)}
          data-testid={`student-result-${student.id}`}
        >
          {student.email}
        </button>
      ))}
    </div>
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("InviteStudentDialog", () => {
  const defaultProps = {
    classId: "class-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnrollStudent.mockResolvedValue({ success: true });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ students: [] }),
    });
  });

  describe("rendering", () => {
    it("should render Invite Student trigger button", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Invite Student/i })).toBeInTheDocument();
    });

    it("should render dialog title", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Invite Student to Class"
      );
    });

    it("should render dialog description", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByText(/Search and add students/i)).toBeInTheDocument();
    });

    it("should render search input", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Search by Email or User ID/i)).toBeInTheDocument();
    });

    it("should render search button", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    });

    it("should render Cancel button", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("should render Enroll Student button", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Enroll Student/i })).toBeInTheDocument();
    });

    it("should render manual ID input field", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Or enter Student ID manually/i)).toBeInTheDocument();
    });

    it("should render helper text", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      expect(
        screen.getByText("Enter student email or user ID to find them")
      ).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("should call search API when clicking Search button", async () => {
      render(<InviteStudentDialog {...defaultProps} />);

      const input = screen.getByLabelText(/Search by Email or User ID/i);
      fireEvent.change(input, { target: { value: "student@test.com" } });

      // Wait for any immediate search to complete
      await waitFor(() => {}, { timeout: 100 });

      // Clear previous fetch calls
      mockFetch.mockClear();

      const searchButton = screen.getByRole("button", { name: "Search" });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/teacher/search-students",
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });

    it("should show error toast when search fails via button", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      render(<InviteStudentDialog {...defaultProps} />);

      const input = screen.getByLabelText(/Search by Email or User ID/i);
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const searchButton = screen.getByRole("button", { name: "Search" });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to search students");
      });
    });

    it("should handle search network error via button", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<InviteStudentDialog {...defaultProps} />);

      const input = screen.getByLabelText(/Search by Email or User ID/i);
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const searchButton = screen.getByRole("button", { name: "Search" });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "An error occurred while searching"
        );
      });
    });

    it("should disable Search button when input is empty", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: "Search" });
      expect(searchButton).toBeDisabled();
    });
  });

  describe("enrollment functionality", () => {
    it("should disable Enroll button when no student selected", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      expect(enrollButton).toBeDisabled();
    });

    it("should enable Enroll button when student ID is entered", () => {
      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      expect(enrollButton).not.toBeDisabled();
    });

    it("should call enrollStudent action on submit", async () => {
      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      fireEvent.click(enrollButton);

      await waitFor(() => {
        expect(mockEnrollStudent).toHaveBeenCalledWith("class-123", "student-id-123");
      });
    });

    it("should show success toast on successful enrollment", async () => {
      mockEnrollStudent.mockResolvedValue({ success: true });

      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      fireEvent.click(enrollButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Student enrolled successfully!"
        );
      });
    });

    it("should refresh router on successful enrollment", async () => {
      mockEnrollStudent.mockResolvedValue({ success: true });

      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      fireEvent.click(enrollButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should show error toast on failed enrollment", async () => {
      mockEnrollStudent.mockResolvedValue({
        success: false,
        error: "Student already enrolled",
      });

      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      fireEvent.click(enrollButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Student already enrolled");
      });
    });

    it("should show error toast on enrollment exception", async () => {
      mockEnrollStudent.mockRejectedValue(new Error("Network error"));

      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      fireEvent.click(enrollButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("An unexpected error occurred");
      });
    });

    it("should show error when submitting without student", async () => {
      render(<InviteStudentDialog {...defaultProps} />);

      // Force enable the button by targeting the form directly
      const form = screen.getByRole("button", { name: /Enroll Student/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Please select a student");
      });
    });
  });

  describe("loading states", () => {
    it("should show Enrolling... text when loading", async () => {
      mockEnrollStudent.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<InviteStudentDialog {...defaultProps} />);

      const manualInput = screen.getByLabelText(/Or enter Student ID manually/i);
      fireEvent.change(manualInput, { target: { value: "student-id-123" } });

      const enrollButton = screen.getByRole("button", { name: /Enroll Student/i });
      fireEvent.click(enrollButton);

      expect(screen.getByRole("button", { name: /Enrolling.../i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Enroll Student/i })).toBeInTheDocument();
      });
    });
  });
});
