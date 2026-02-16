/**
 * Tests for CreateClassDialog component
 * Target: ~20 tests covering dialog, form, and submission
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateClassDialog } from "@/components/teacher/CreateClassDialog";

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

// Mock createClass action
const mockCreateClass = jest.fn();
jest.mock("@/app/actions/teacher", () => ({
  createClass: (...args: unknown[]) => mockCreateClass(...args),
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock ClassCreationSuccess
jest.mock("@/components/teacher/ClassCreationSuccess", () => ({
  ClassCreationSuccess: ({
    classCode,
    joinPin,
    onDone,
  }: {
    classCode: string;
    joinPin: string;
    onDone: () => void;
  }) => (
    <div data-testid="class-creation-success">
      <p>Class Code: {classCode}</p>
      <p>Join PIN: {joinPin}</p>
      <button onClick={onDone}>Done</button>
    </div>
  ),
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
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
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

// Helper to find submit button specifically
const getSubmitButton = () => {
  const buttons = screen.getAllByRole("button", { name: /create class/i });
  // The submit button has type="submit"
  return buttons.find((btn) => btn.getAttribute("type") === "submit") || buttons[buttons.length - 1];
};

describe("CreateClassDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render create class trigger button", () => {
      render(<CreateClassDialog />);

      expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
    });

    it("should render dialog title", () => {
      render(<CreateClassDialog />);

      expect(screen.getByTestId("dialog-title")).toHaveTextContent("Create New Class");
    });

    it("should render dialog description", () => {
      render(<CreateClassDialog />);

      expect(screen.getByText(/add a new class to manage students/i)).toBeInTheDocument();
    });

    it("should render class name input", () => {
      render(<CreateClassDialog />);

      expect(screen.getByLabelText(/class name/i)).toBeInTheDocument();
    });

    it("should render subject input", () => {
      render(<CreateClassDialog />);

      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    });

    it("should render cancel button", () => {
      render(<CreateClassDialog />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should have placeholder for class name", () => {
      render(<CreateClassDialog />);

      expect(screen.getByPlaceholderText(/class 10-a/i)).toBeInTheDocument();
    });

    it("should have placeholder for subject", () => {
      render(<CreateClassDialog />);

      expect(screen.getByPlaceholderText(/mathematics, english/i)).toBeInTheDocument();
    });
  });

  describe("button state", () => {
    it("should disable submit button when name is empty", () => {
      render(<CreateClassDialog />);

      const submitButton = getSubmitButton();
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when name is provided", () => {
      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should call createClass with name and subject", async () => {
      mockCreateClass.mockResolvedValue({
        success: true,
        data: { class_code: "ABC123", join_pin: "1234" },
      });

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      const subjectInput = screen.getByLabelText(/subject/i);

      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });
      fireEvent.change(subjectInput, { target: { value: "Mathematics" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateClass).toHaveBeenCalledWith("Class 10-A", "Mathematics");
      });
    });

    it("should show loading state during submission", async () => {
      mockCreateClass.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, data: { class_code: "ABC", join_pin: "1234" } }), 1000)
          )
      );

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Creating...")).toBeInTheDocument();
      });
    });

    it("should show success toast on successful creation", async () => {
      mockCreateClass.mockResolvedValue({
        success: true,
        data: { class_code: "ABC123", join_pin: "1234" },
      });

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Class created successfully!");
      });
    });

    it("should show class creation success component after successful creation", async () => {
      mockCreateClass.mockResolvedValue({
        success: true,
        data: { class_code: "ABC123", join_pin: "1234" },
      });

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("class-creation-success")).toBeInTheDocument();
        expect(screen.getByText("Class Code: ABC123")).toBeInTheDocument();
        expect(screen.getByText("Join PIN: 1234")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should show error toast on failure with error message", async () => {
      mockCreateClass.mockResolvedValue({
        success: false,
        error: "Class name already exists",
      });

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Class name already exists");
      });
    });

    it("should show generic error toast on failure without message", async () => {
      mockCreateClass.mockResolvedValue({ success: false });

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to create class");
      });
    });

    it("should show error toast on exception", async () => {
      mockCreateClass.mockRejectedValue(new Error("Network error"));

      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("An unexpected error occurred");
      });
    });
  });

  describe("form inputs", () => {
    it("should update class name on input change", () => {
      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      fireEvent.change(nameInput, { target: { value: "Class 10-A" } });

      expect(nameInput).toHaveValue("Class 10-A");
    });

    it("should update subject on input change", () => {
      render(<CreateClassDialog />);

      const subjectInput = screen.getByLabelText(/subject/i);
      fireEvent.change(subjectInput, { target: { value: "Mathematics" } });

      expect(subjectInput).toHaveValue("Mathematics");
    });

    it("should have required attribute on class name input", () => {
      render(<CreateClassDialog />);

      const nameInput = screen.getByLabelText(/class name/i);
      expect(nameInput).toHaveAttribute("required");
    });
  });
});
