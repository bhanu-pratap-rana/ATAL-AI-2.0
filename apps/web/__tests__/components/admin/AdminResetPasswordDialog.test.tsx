/**
 * Tests for AdminResetPasswordDialog component
 * Target: ~25 tests covering rendering, validation, and password reset
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminResetPasswordDialog } from "@/components/admin/AdminResetPasswordDialog";

// Mock the server action
const mockResetAdminPassword = jest.fn();
jest.mock("@/app/actions/admin-management", () => ({
  resetAdminPassword: (...args: unknown[]) => mockResetAdminPassword(...args),
}));

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

// Mock lucide-react
jest.mock("lucide-react", () => ({
  AlertCircle: ({ className }: { className?: string }) => (
    <span data-testid="alert-circle" className={className}>
      Alert
    </span>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="check-circle" className={className}>
      Check
    </span>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className}>
      Loading
    </span>
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="x-icon" className={className}>
      X
    </span>
  ),
}));

// Mock PasswordInput
jest.mock("@/components/ui/PasswordInput", () => ({
  PasswordInput: ({
    id,
    label,
    placeholder,
    value,
    onChange,
    disabled,
    helpText,
  }: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    showPassword?: boolean;
    onShowPasswordChange?: (show: boolean) => void;
    helpText?: string;
  }) => (
    <div data-testid={`password-input-${id}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={id}
      />
      {helpText && <span>{helpText}</span>}
    </div>
  ),
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock form timing
jest.mock("@/lib/constants/ui-timings", () => ({
  FORM_TIMING: {
    successCallback: 100,
  },
}));

describe("AdminResetPasswordDialog", () => {
  const defaultProps = {
    adminId: "admin-123",
    adminEmail: "admin@example.com",
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<AdminResetPasswordDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Reset Password")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "Reset Password" })).toBeInTheDocument();
    });

    it("should display admin email in info box", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    });

    it("should render informational text", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(
        screen.getByText(/the admin will need to use the new password/i)
      ).toBeInTheDocument();
    });

    it("should render new password input", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByTestId("new-password")).toBeInTheDocument();
    });

    it("should render confirm password input", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByTestId("confirm-password")).toBeInTheDocument();
    });

    it("should render cancel button", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should render reset password button", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
    });

    it("should render close button with X icon", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });
  });

  describe("button state", () => {
    it("should disable reset button when password is empty", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const button = screen.getByRole("button", { name: /reset password/i });
      expect(button).toBeDisabled();
    });

    it("should disable reset button when confirm password is empty", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      expect(button).toBeDisabled();
    });

    it("should enable reset button when both fields are filled", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe("validation", () => {
    it("should show error when password is too short", async () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "short" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "short" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "different123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it("should display alert icon for validation errors", async () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "different123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("alert-circle")).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("should call resetAdminPassword with correct parameters", async () => {
      mockResetAdminPassword.mockResolvedValue({ success: true });

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "newpassword123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "newpassword123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockResetAdminPassword).toHaveBeenCalledWith("admin-123", "newpassword123");
      });
    });

    it("should show loading state during submission", async () => {
      mockResetAdminPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Resetting...")).toBeInTheDocument();
        expect(screen.getByTestId("loader")).toBeInTheDocument();
      });
    });

    it("should show success message on successful reset", async () => {
      mockResetAdminPassword.mockResolvedValue({ success: true });

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
        expect(screen.getByTestId("check-circle")).toBeInTheDocument();
      });
    });

    it("should call toast.success on successful reset", async () => {
      mockResetAdminPassword.mockResolvedValue({ success: true });

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Password reset successfully");
      });
    });

    it("should call onClose and onSuccess after successful reset with delay", async () => {
      mockResetAdminPassword.mockResolvedValue({ success: true });

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should show error message on failed reset", async () => {
      mockResetAdminPassword.mockResolvedValue({
        success: false,
        error: "Invalid admin ID",
      });

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Invalid admin ID")).toBeInTheDocument();
      });
    });

    it("should call toast.error on failed reset", async () => {
      mockResetAdminPassword.mockResolvedValue({
        success: false,
        error: "Invalid admin ID",
      });

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Invalid admin ID");
      });
    });

    it("should handle unexpected errors", async () => {
      mockResetAdminPassword.mockRejectedValue(new Error("Network error"));

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  describe("close behavior", () => {
    it("should call onClose when cancel button is clicked", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when X button is clicked", () => {
      render(<AdminResetPasswordDialog {...defaultProps} />);

      const closeButton = screen.getByTestId("x-icon").parentElement;
      fireEvent.click(closeButton!);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should not close while loading", async () => {
      mockResetAdminPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      const onCloseMock = jest.fn();
      render(<AdminResetPasswordDialog {...defaultProps} onClose={onCloseMock} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Resetting...")).toBeInTheDocument();
      });

      // Try to close
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should not close because isLoading is true
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("should disable close button while loading", async () => {
      mockResetAdminPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /reset password/i });
      fireEvent.click(button);

      await waitFor(() => {
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        expect(cancelButton).toBeDisabled();
      });
    });

    it("should clear form when closed", () => {
      const { rerender } = render(<AdminResetPasswordDialog {...defaultProps} />);

      const passwordInput = screen.getByTestId("new-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      // Close the dialog
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Reopen
      rerender(<AdminResetPasswordDialog {...defaultProps} isOpen={false} />);
      rerender(<AdminResetPasswordDialog {...defaultProps} isOpen={true} />);

      // Form should be cleared (new component instance)
      expect(screen.getByTestId("new-password")).toHaveValue("");
    });
  });
});
