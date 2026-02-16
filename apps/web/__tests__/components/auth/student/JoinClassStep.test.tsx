/**
 * Tests for JoinClassStep component
 * Target: ~20 tests covering rendering, validation, and form submission
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JoinClassStep } from "@/components/auth/student/JoinClassStep";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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

// Mock joinClass action
const mockJoinClass = jest.fn();
jest.mock("@/app/actions/student", () => ({
  joinClass: (...args: unknown[]) => mockJoinClass(...args),
}));

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock AuthCard
jest.mock("@/components/auth/AuthCard", () => ({
  AuthCard: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="auth-card">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

describe("JoinClassStep", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setJoinClassCode: jest.fn(),
    setJoinClassPin: jest.fn(),
    setJoinClassError: jest.fn(),
    resetJoinClass: jest.fn(),
  };

  const defaultState = {
    joinClassCode: "",
    joinClassPin: "",
    joinClassError: null as string | null,
  };

  const defaultProps = {
    state: defaultState,
    actions: mockActions,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoinClass.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("should render the Join a Class title", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByText("Join a Class")).toBeInTheDocument();
    });

    it("should render description about class code and PIN", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(
        screen.getByText("Enter the class code and PIN from your teacher")
      ).toBeInTheDocument();
    });

    it("should render class code input", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByLabelText("Class Code")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g., ABC-123")).toBeInTheDocument();
    });

    it("should render class PIN input", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByLabelText("Class PIN")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••")).toBeInTheDocument();
    });

    it("should render helper text for class code", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByText("Ask your teacher for the class code")).toBeInTheDocument();
    });

    it("should render helper text for PIN", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByText("4-digit PIN provided by your teacher")).toBeInTheDocument();
    });

    it("should render Join Class button", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByRole("button", { name: /join class/i })).toBeInTheDocument();
    });

    it("should render Skip for now button", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.getByRole("button", { name: /skip for now/i })).toBeInTheDocument();
    });

    it("should render note about getting code from teacher", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(
        screen.getByText(/Get the class code and PIN from your teacher/i)
      ).toBeInTheDocument();
    });
  });

  describe("input behavior", () => {
    it("should call setJoinClassCode when typing class code", () => {
      render(<JoinClassStep {...defaultProps} />);

      const input = screen.getByLabelText("Class Code");
      fireEvent.change(input, { target: { value: "ABC123" } });

      expect(mockActions.setJoinClassCode).toHaveBeenCalled();
    });

    it("should call setJoinClassPin when typing PIN", () => {
      render(<JoinClassStep {...defaultProps} />);

      const input = screen.getByLabelText("Class PIN");
      fireEvent.change(input, { target: { value: "1234" } });

      expect(mockActions.setJoinClassPin).toHaveBeenCalled();
    });

    it("should display current class code value", () => {
      const stateWithCode = {
        ...defaultState,
        joinClassCode: "ABC-123",
      };
      render(<JoinClassStep {...defaultProps} state={stateWithCode} />);

      expect(screen.getByLabelText("Class Code")).toHaveValue("ABC-123");
    });

    it("should display current PIN value", () => {
      const stateWithPin = {
        ...defaultState,
        joinClassPin: "1234",
      };
      render(<JoinClassStep {...defaultProps} state={stateWithPin} />);

      expect(screen.getByLabelText("Class PIN")).toHaveValue("1234");
    });
  });

  describe("button disabled states", () => {
    it("should disable Join Class button when class code is empty", () => {
      const state = { ...defaultState, joinClassCode: "", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      expect(screen.getByRole("button", { name: /join class/i })).toBeDisabled();
    });

    it("should disable Join Class button when PIN is less than 4 digits", () => {
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "123" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      expect(screen.getByRole("button", { name: /join class/i })).toBeDisabled();
    });

    it("should enable Join Class button when both fields are valid", () => {
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      expect(screen.getByRole("button", { name: /join class/i })).not.toBeDisabled();
    });

    it("should disable inputs when loading", () => {
      render(<JoinClassStep {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText("Class Code")).toBeDisabled();
      expect(screen.getByLabelText("Class PIN")).toBeDisabled();
    });

    it("should disable buttons when loading", () => {
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} isLoading={true} />);

      expect(screen.getByRole("button", { name: /join class/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /skip for now/i })).toBeDisabled();
    });
  });

  describe("error display", () => {
    it("should display error message when joinClassError is set", () => {
      const state = { ...defaultState, joinClassError: "Invalid class code" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      expect(screen.getByText("Invalid class code")).toBeInTheDocument();
    });

    it("should not display error when joinClassError is null", () => {
      render(<JoinClassStep {...defaultProps} />);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe("skip functionality", () => {
    it("should navigate to dashboard when Skip is clicked", () => {
      render(<JoinClassStep {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));

      expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  describe("form submission", () => {
    it("should call joinClass action on submit", async () => {
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      await waitFor(() => {
        expect(mockJoinClass).toHaveBeenCalledWith({
          classCode: "ABC-123",
          pin: "1234",
        });
      });
    });

    it("should show success toast on successful join", async () => {
      mockJoinClass.mockResolvedValue({ success: true });
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Successfully joined the class!");
      });
    });

    it("should reset join class state on success", async () => {
      mockJoinClass.mockResolvedValue({ success: true });
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.resetJoinClass).toHaveBeenCalled();
      });
    });

    it("should show error toast on failed join", async () => {
      mockJoinClass.mockResolvedValue({ success: false, error: "Class not found" });
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it("should set error state on failed join", async () => {
      mockJoinClass.mockResolvedValue({ success: false, error: "Invalid PIN" });
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setJoinClassError).toHaveBeenCalled();
      });
    });

    it("should handle unexpected errors", async () => {
      mockJoinClass.mockRejectedValue(new Error("Network error"));
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setJoinClassError).toHaveBeenCalledWith(
          "An unexpected error occurred"
        );
      });
    });

    it("should set loading state during submission", async () => {
      mockJoinClass.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      const state = { ...defaultState, joinClassCode: "ABC-123", joinClassPin: "1234" };
      render(<JoinClassStep {...defaultProps} state={state} />);

      fireEvent.submit(screen.getByRole("button", { name: /join class/i }).closest("form")!);

      expect(mockActions.setIsLoading).toHaveBeenCalledWith(true);

      await waitFor(() => {
        expect(mockActions.setIsLoading).toHaveBeenCalledWith(false);
      });
    });
  });
});
