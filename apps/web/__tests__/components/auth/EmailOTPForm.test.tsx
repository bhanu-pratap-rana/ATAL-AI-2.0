/**
 * Tests for EmailOTPForm component
 * Target: ~15 tests covering email input, validation, and OTP request
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailOTPForm } from "@/components/auth/EmailOTPForm";

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

// Mock requestOtp action
const mockRequestOtp = jest.fn();
jest.mock("@/app/actions/auth", () => ({
  requestOtp: (...args: unknown[]) => mockRequestOtp(...args),
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: jest.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { valid: false, error: "Invalid email format" };
    }
    return { valid: true, error: null };
  }),
}));

// Mock form component utils
jest.mock("@/lib/form-component-utils", () => ({
  useFormSubmission: (
    handler: () => Promise<unknown>,
    onError: (error: string | null) => void,
    _context: string,
    onSuccess?: () => void
  ) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const result = await handler();
        if (onSuccess) onSuccess();
        return result;
      } catch (error) {
        onError(error instanceof Error ? error.message : "An error occurred");
      }
    };
  },
  FORM_TOAST_MESSAGES: {
    EMAIL_OTP_SENT: "OTP sent to your email!",
  },
}));

// Mock FormErrorHelper
jest.mock("@/components/form/FormErrorHelper", () => ({
  FormErrorHelper: ({
    error,
    helperText,
  }: {
    error: string | null;
    helperText: string;
  }) => (
    <div data-testid="form-error-helper">
      {error ? (
        <span role="alert" className="error">
          {error}
        </span>
      ) : (
        <span className="helper">{helperText}</span>
      )}
    </div>
  ),
}));

describe("EmailOTPForm", () => {
  const defaultProps = {
    email: "",
    onEmailChange: jest.fn(),
    onOtpSent: jest.fn(),
    isLoading: false,
    error: null,
    onErrorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestOtp.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("should render email input with label", () => {
      render(<EmailOTPForm {...defaultProps} />);

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your@email.com/)).toBeInTheDocument();
    });

    it("should render submit button with default label", () => {
      render(<EmailOTPForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Send OTP" })).toBeInTheDocument();
    });

    it("should render submit button with custom label", () => {
      render(<EmailOTPForm {...defaultProps} submitButtonLabel="Request Code" />);

      expect(screen.getByRole("button", { name: "Request Code" })).toBeInTheDocument();
    });

    it("should render helper text", () => {
      render(<EmailOTPForm {...defaultProps} helperText="Custom helper text" />);

      expect(screen.getByText("Custom helper text")).toBeInTheDocument();
    });

    it("should render default helper text when not provided", () => {
      render(<EmailOTPForm {...defaultProps} />);

      expect(screen.getByText("Enter your email to receive an OTP")).toBeInTheDocument();
    });
  });

  describe("email input", () => {
    it("should call onEmailChange when input changes", () => {
      render(<EmailOTPForm {...defaultProps} />);

      const input = screen.getByLabelText(/Email Address/i);
      fireEvent.change(input, { target: { value: "test@example.com" } });

      expect(defaultProps.onEmailChange).toHaveBeenCalledWith("test@example.com");
    });

    it("should display email value", () => {
      render(<EmailOTPForm {...defaultProps} email="user@test.com" />);

      const input = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
      expect(input.value).toBe("user@test.com");
    });

    it("should have correct input type", () => {
      render(<EmailOTPForm {...defaultProps} />);

      const input = screen.getByLabelText(/Email Address/i);
      expect(input).toHaveAttribute("type", "email");
    });
  });

  describe("loading state", () => {
    it("should disable input when loading", () => {
      render(<EmailOTPForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/Email Address/i)).toBeDisabled();
    });

    it("should disable submit button when loading", () => {
      render(<EmailOTPForm {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button", { name: /Sending/i });
      expect(button).toBeDisabled();
    });

    it("should show 'Sending...' text when loading", () => {
      render(<EmailOTPForm {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Sending...")).toBeInTheDocument();
    });

    it("should have aria-busy attribute when loading", () => {
      render(<EmailOTPForm {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button", { name: /Sending/i });
      expect(button).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("error handling", () => {
    it("should display error message when error prop is provided", () => {
      render(<EmailOTPForm {...defaultProps} error="Email already registered" />);

      expect(screen.getByRole("alert")).toHaveTextContent("Email already registered");
    });

    it("should have aria-describedby for email-error when error exists", () => {
      render(<EmailOTPForm {...defaultProps} error="Invalid email" />);

      const input = screen.getByLabelText(/Email Address/i);
      expect(input).toHaveAttribute("aria-describedby", "email-error");
    });
  });

  describe("form submission", () => {
    it("should call requestOtp and onOtpSent on successful submission", async () => {
      const mockOnOtpSent = jest.fn();
      mockRequestOtp.mockResolvedValue({ success: true });

      render(
        <EmailOTPForm
          {...defaultProps}
          email="valid@example.com"
          onOtpSent={mockOnOtpSent}
        />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockRequestOtp).toHaveBeenCalledWith("valid@example.com");
      });

      await waitFor(() => {
        expect(mockOnOtpSent).toHaveBeenCalled();
      });
    });

    it("should show success toast on successful OTP send", async () => {
      mockRequestOtp.mockResolvedValue({ success: true });

      render(<EmailOTPForm {...defaultProps} email="test@example.com" />);

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("OTP sent to your email!");
      });
    });

    it("should call onErrorChange when requestOtp fails", async () => {
      const mockOnErrorChange = jest.fn();
      mockRequestOtp.mockResolvedValue({ success: false, error: "Server error" });

      render(
        <EmailOTPForm
          {...defaultProps}
          email="test@example.com"
          onErrorChange={mockOnErrorChange}
        />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnErrorChange).toHaveBeenCalledWith("Server error");
      });
    });

    it("should have required attribute on email input", () => {
      render(<EmailOTPForm {...defaultProps} />);

      const input = screen.getByLabelText(/Email Address/i);
      expect(input).toHaveAttribute("required");
    });

    it("should not call requestOtp when email is empty", async () => {
      render(
        <EmailOTPForm {...defaultProps} email="" />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      // Form has required attribute, so browser validation prevents submission
      await waitFor(() => {
        expect(mockRequestOtp).not.toHaveBeenCalled();
      });
    });
  });
});
