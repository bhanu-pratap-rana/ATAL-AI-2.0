/**
 * Tests for AdminCreateForm component
 * Target: ~25 tests covering rendering, validation, and form submission
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminCreateForm } from "@/components/admin/AdminCreateForm";

// Mock the server action
const mockCreateAdminAccount = jest.fn();
jest.mock("@/app/actions/admin-management", () => ({
  createAdminAccount: (...args: unknown[]) => mockCreateAdminAccount(...args),
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

describe("AdminCreateForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("should render email input", () => {
      render(<AdminCreateForm />);

      expect(screen.getByLabelText(/admin email/i)).toBeInTheDocument();
    });

    it("should render email input with placeholder", () => {
      render(<AdminCreateForm />);

      expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
    });

    it("should render password input", () => {
      render(<AdminCreateForm />);

      expect(screen.getByTestId("create-password")).toBeInTheDocument();
    });

    it("should render confirm password input", () => {
      render(<AdminCreateForm />);

      expect(screen.getByTestId("confirm-password")).toBeInTheDocument();
    });

    it("should render create button", () => {
      render(<AdminCreateForm />);

      expect(screen.getByRole("button", { name: /create admin account/i })).toBeInTheDocument();
    });

    it("should render email help text", () => {
      render(<AdminCreateForm />);

      expect(screen.getByText(/this email will be used to login/i)).toBeInTheDocument();
    });

    it("should render password requirements help text", () => {
      render(<AdminCreateForm />);

      expect(screen.getByText(/minimum 8 characters required/i)).toBeInTheDocument();
    });
  });

  describe("button state", () => {
    it("should disable button when email is empty", () => {
      render(<AdminCreateForm />);

      const button = screen.getByRole("button", { name: /create admin account/i });
      expect(button).toBeDisabled();
    });

    it("should disable button when password is empty", () => {
      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      expect(button).toBeDisabled();
    });

    it("should disable button when confirm password is empty", () => {
      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      expect(button).toBeDisabled();
    });

    it("should enable button when all fields are filled", () => {
      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe("validation", () => {
    it("should show error when email is empty on submit", async () => {
      render(<AdminCreateForm />);

      // Manually fill to enable button but leave email empty after trim
      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "   " } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      // Button should still be disabled due to trim check
      const button = screen.getByRole("button", { name: /create admin account/i });
      expect(button).toBeDisabled();
    });

    it("should show error when password is too short", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: false });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "short" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "short" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "different123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("should call createAdminAccount on valid submission", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCreateAdminAccount).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
          "admin"
        );
      });
    });

    it("should pass super_admin role when specified", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });

      render(<AdminCreateForm adminRole="super_admin" />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "superadmin@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCreateAdminAccount).toHaveBeenCalledWith(
          "superadmin@example.com",
          "password123",
          "super_admin"
        );
      });
    });

    it("should show loading state during submission", async () => {
      mockCreateAdminAccount.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Creating...")).toBeInTheDocument();
        expect(screen.getByTestId("loader")).toBeInTheDocument();
      });
    });

    it("should show success message on successful creation", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/admin account created successfully/i)).toBeInTheDocument();
        expect(screen.getByTestId("check-circle")).toBeInTheDocument();
      });
    });

    it("should call toast.success on successful creation", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should clear form after successful creation", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(emailInput).toHaveValue("");
        expect(passwordInput).toHaveValue("");
        expect(confirmInput).toHaveValue("");
      });
    });

    it("should call onSuccess callback after successful creation", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });
      const mockOnSuccess = jest.fn();

      render(<AdminCreateForm onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/admin account created successfully/i)).toBeInTheDocument();
      });

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should show error message on failed creation", async () => {
      mockCreateAdminAccount.mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Email already exists")).toBeInTheDocument();
        expect(screen.getByTestId("alert-circle")).toBeInTheDocument();
      });
    });

    it("should call toast.error on failed creation", async () => {
      mockCreateAdminAccount.mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Email already exists");
      });
    });

    it("should handle unexpected errors", async () => {
      mockCreateAdminAccount.mockRejectedValue(new Error("Network error"));

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show default error message for non-Error exceptions", async () => {
      mockCreateAdminAccount.mockRejectedValue("String error");

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("email normalization", () => {
    it("should trim and lowercase email before submission", async () => {
      mockCreateAdminAccount.mockResolvedValue({ success: true });

      render(<AdminCreateForm />);

      const emailInput = screen.getByPlaceholderText("admin@example.com");
      fireEvent.change(emailInput, { target: { value: "  TEST@EXAMPLE.COM  " } });

      const passwordInput = screen.getByTestId("create-password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const confirmInput = screen.getByTestId("confirm-password");
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const button = screen.getByRole("button", { name: /create admin account/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCreateAdminAccount).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
          "admin"
        );
      });
    });
  });
});
