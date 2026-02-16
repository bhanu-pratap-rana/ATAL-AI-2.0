/**
 * Tests for PasswordValidationForm component
 * Target: ~18 tests covering password input, visibility toggle, validation, and submission
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasswordValidationForm } from "@/components/auth/PasswordValidationForm";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validatePassword: jest.fn((password: string) => {
    if (password.length < 8) {
      return { valid: false, errors: ["Password must be at least 8 characters"] };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, errors: ["Password must contain uppercase letter"] };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, errors: ["Password must contain lowercase letter"] };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, errors: ["Password must contain number"] };
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return { valid: false, errors: ["Password must contain special character"] };
    }
    return { valid: true, errors: [] };
  }),
  validatePasswordMatch: jest.fn((password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      return { valid: false, error: "Passwords do not match" };
    }
    return { valid: true, error: null };
  }),
}));

// Mock form component utils
let mockShowPassword = false;
let mockShowConfirm = false;

jest.mock("@/lib/form-component-utils", () => ({
  useFormSubmission: (
    handler: () => Promise<void>,
    onError: (error: string | null) => void
  ) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await handler();
      } catch (error) {
        onError(error instanceof Error ? error.message : "An error occurred");
      }
    };
  },
  usePasswordVisibility: () => ({
    showPassword: mockShowPassword,
    showConfirm: mockShowConfirm,
    togglePasswordVisibility: () => {
      mockShowPassword = !mockShowPassword;
    },
    toggleConfirmVisibility: () => {
      mockShowConfirm = !mockShowConfirm;
    },
  }),
}));

describe("PasswordValidationForm", () => {
  const defaultProps = {
    password: "",
    onPasswordChange: jest.fn(),
    passwordConfirm: "",
    onPasswordConfirmChange: jest.fn(),
    isLoading: false,
    error: null,
    onErrorChange: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowPassword = false;
    mockShowConfirm = false;
  });

  describe("rendering", () => {
    it("should render password and confirm password inputs", () => {
      render(<PasswordValidationForm {...defaultProps} />);

      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    it("should render submit button with default label", () => {
      render(<PasswordValidationForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    });

    it("should render submit button with custom label", () => {
      render(<PasswordValidationForm {...defaultProps} submitButtonLabel="Reset Password" />);

      expect(screen.getByRole("button", { name: "Reset Password" })).toBeInTheDocument();
    });

    it("should show validation requirements when showValidation is true", () => {
      render(<PasswordValidationForm {...defaultProps} showValidation={true} />);

      expect(screen.getByText(/Minimum 8 characters/)).toBeInTheDocument();
      expect(screen.getByText(/uppercase, lowercase, number/)).toBeInTheDocument();
    });

    it("should hide validation requirements when showValidation is false", () => {
      render(<PasswordValidationForm {...defaultProps} showValidation={false} />);

      expect(screen.queryByText(/Minimum 8 characters/)).not.toBeInTheDocument();
    });

    it("should render visibility toggle buttons", () => {
      render(<PasswordValidationForm {...defaultProps} />);

      const toggleButtons = screen.getAllByRole("button", { name: /password/i });
      // Should have 2 visibility toggles + 1 submit button
      expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("password input", () => {
    it("should call onPasswordChange when password input changes", () => {
      render(<PasswordValidationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^Password$/i);
      fireEvent.change(passwordInput, { target: { value: "newpassword" } });

      expect(defaultProps.onPasswordChange).toHaveBeenCalledWith("newpassword");
    });

    it("should call onPasswordConfirmChange when confirm password input changes", () => {
      render(<PasswordValidationForm {...defaultProps} />);

      const confirmInput = screen.getByLabelText(/Confirm Password/i);
      fireEvent.change(confirmInput, { target: { value: "confirmpassword" } });

      expect(defaultProps.onPasswordConfirmChange).toHaveBeenCalledWith("confirmpassword");
    });

    it("should display password value", () => {
      render(<PasswordValidationForm {...defaultProps} password="mypassword" />);

      const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
      expect(passwordInput.value).toBe("mypassword");
    });

    it("should display confirm password value", () => {
      render(<PasswordValidationForm {...defaultProps} passwordConfirm="confirmpass" />);

      const confirmInput = screen.getByLabelText(/Confirm Password/i) as HTMLInputElement;
      expect(confirmInput.value).toBe("confirmpass");
    });
  });

  describe("password visibility toggle", () => {
    it("should render password input with type password by default", () => {
      render(<PasswordValidationForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^Password$/i);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("should show Eye icon when password is hidden", () => {
      mockShowPassword = false;
      render(<PasswordValidationForm {...defaultProps} />);

      expect(screen.getAllByTestId("eye-icon").length).toBeGreaterThan(0);
    });
  });

  describe("loading state", () => {
    it("should disable inputs when loading", () => {
      render(<PasswordValidationForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/^Password$/i)).toBeDisabled();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeDisabled();
    });

    it("should disable submit button when loading", () => {
      render(<PasswordValidationForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole("button", { name: /Processing/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show 'Processing...' text when loading", () => {
      render(<PasswordValidationForm {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    it("should have aria-busy attribute when loading", () => {
      render(<PasswordValidationForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole("button", { name: /Processing/i });
      expect(submitButton).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("error handling", () => {
    it("should display error message when error prop is provided", () => {
      render(<PasswordValidationForm {...defaultProps} error="Password is too weak" />);

      expect(screen.getByRole("alert")).toHaveTextContent("Password is too weak");
    });

    it("should not display error message when error is null", () => {
      render(<PasswordValidationForm {...defaultProps} error={null} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should have proper aria-describedby when error exists", () => {
      render(<PasswordValidationForm {...defaultProps} error="Error message" />);

      const passwordInput = screen.getByLabelText(/^Password$/i);
      expect(passwordInput).toHaveAttribute("aria-describedby", "password-error");
    });
  });

  describe("form submission", () => {
    it("should call onSubmit when form is submitted with valid data", async () => {
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <PasswordValidationForm
          {...defaultProps}
          password="ValidPass1!"
          passwordConfirm="ValidPass1!"
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should call onErrorChange with validation error for weak password", async () => {
      const mockOnErrorChange = jest.fn();
      render(
        <PasswordValidationForm
          {...defaultProps}
          password="weak"
          passwordConfirm="weak"
          onErrorChange={mockOnErrorChange}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnErrorChange).toHaveBeenCalledWith(
          expect.stringContaining("Password must be at least 8 characters")
        );
      });
    });

    it("should call onErrorChange when passwords do not match", async () => {
      const mockOnErrorChange = jest.fn();
      render(
        <PasswordValidationForm
          {...defaultProps}
          password="ValidPass1!"
          passwordConfirm="DifferentPass1!"
          onErrorChange={mockOnErrorChange}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnErrorChange).toHaveBeenCalledWith("Passwords do not match");
      });
    });
  });
});
