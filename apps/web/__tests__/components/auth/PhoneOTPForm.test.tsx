/**
 * Tests for PhoneOTPForm component
 * Target: ~15 tests covering phone input, validation, and OTP request
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhoneOTPForm } from "@/components/auth/PhoneOTPForm";

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
  validatePhone: jest.fn((phone: string) => {
    // Expect +91 prefix with 10 digit number
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: "Invalid phone number" };
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
    PHONE_OTP_SENT: "OTP sent to your phone!",
  },
}));

// Mock PhoneInputWithPrefix
jest.mock("@/components/auth/PhoneInputWithPrefix", () => ({
  PhoneInputWithPrefix: ({
    id,
    label,
    value,
    onChange,
    disabled,
    error,
    helperText,
    required,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error: string | null;
    helperText: string;
    required?: boolean;
  }) => (
    <div data-testid="phone-input-container">
      <label htmlFor={id}>{label}</label>
      <div>
        <span data-testid="country-prefix">+91</span>
        <input
          id={id}
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          placeholder="Enter phone number"
          data-testid="phone-input"
        />
      </div>
      {error ? (
        <span role="alert">{error}</span>
      ) : (
        <span data-testid="helper-text">{helperText}</span>
      )}
    </div>
  ),
}));

describe("PhoneOTPForm", () => {
  const defaultProps = {
    phone: "",
    onPhoneChange: jest.fn(),
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
    it("should render phone input with label", () => {
      render(<PhoneOTPForm {...defaultProps} />);

      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    });

    it("should render country code prefix", () => {
      render(<PhoneOTPForm {...defaultProps} />);

      expect(screen.getByTestId("country-prefix")).toHaveTextContent("+91");
    });

    it("should render submit button with default label", () => {
      render(<PhoneOTPForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Send OTP" })).toBeInTheDocument();
    });

    it("should render submit button with custom label", () => {
      render(<PhoneOTPForm {...defaultProps} submitButtonLabel="Get Code" />);

      expect(screen.getByRole("button", { name: "Get Code" })).toBeInTheDocument();
    });

    it("should render helper text", () => {
      render(<PhoneOTPForm {...defaultProps} helperText="Enter your registered phone" />);

      expect(screen.getByText("Enter your registered phone")).toBeInTheDocument();
    });

    it("should render default helper text when not provided", () => {
      render(<PhoneOTPForm {...defaultProps} />);

      expect(screen.getByText("Enter your phone number to receive an OTP")).toBeInTheDocument();
    });
  });

  describe("phone input", () => {
    it("should call onPhoneChange when input changes", () => {
      render(<PhoneOTPForm {...defaultProps} />);

      const input = screen.getByTestId("phone-input");
      fireEvent.change(input, { target: { value: "9876543210" } });

      expect(defaultProps.onPhoneChange).toHaveBeenCalledWith("9876543210");
    });

    it("should display phone value", () => {
      render(<PhoneOTPForm {...defaultProps} phone="1234567890" />);

      const input = screen.getByTestId("phone-input") as HTMLInputElement;
      expect(input.value).toBe("1234567890");
    });

    it("should have tel input type", () => {
      render(<PhoneOTPForm {...defaultProps} />);

      const input = screen.getByTestId("phone-input");
      expect(input).toHaveAttribute("type", "tel");
    });
  });

  describe("loading state", () => {
    it("should disable input when loading", () => {
      render(<PhoneOTPForm {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId("phone-input")).toBeDisabled();
    });

    it("should disable submit button when loading", () => {
      render(<PhoneOTPForm {...defaultProps} isLoading={true} phone="1234567890" />);

      const button = screen.getByRole("button", { name: /Sending/i });
      expect(button).toBeDisabled();
    });

    it("should show 'Sending...' text when loading", () => {
      render(<PhoneOTPForm {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Sending...")).toBeInTheDocument();
    });

    it("should have aria-busy attribute when loading", () => {
      render(<PhoneOTPForm {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button", { name: /Sending/i });
      expect(button).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("submit button validation", () => {
    it("should disable submit when phone length is not 10", () => {
      render(<PhoneOTPForm {...defaultProps} phone="12345" />);

      const button = screen.getByRole("button", { name: "Send OTP" });
      expect(button).toBeDisabled();
    });

    it("should enable submit when phone length is exactly 10", () => {
      render(<PhoneOTPForm {...defaultProps} phone="1234567890" />);

      const button = screen.getByRole("button", { name: "Send OTP" });
      expect(button).not.toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("should display error message when error prop is provided", () => {
      render(<PhoneOTPForm {...defaultProps} error="Phone already registered" />);

      expect(screen.getByRole("alert")).toHaveTextContent("Phone already registered");
    });
  });

  describe("form submission", () => {
    it("should call requestOtp with full phone number on success", async () => {
      mockRequestOtp.mockResolvedValue({ success: true });

      render(
        <PhoneOTPForm
          {...defaultProps}
          phone="9876543210"
          onOtpSent={defaultProps.onOtpSent}
        />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockRequestOtp).toHaveBeenCalledWith("+919876543210");
      });
    });

    it("should call onOtpSent callback on successful submission", async () => {
      const mockOnOtpSent = jest.fn();
      mockRequestOtp.mockResolvedValue({ success: true });

      render(
        <PhoneOTPForm {...defaultProps} phone="9876543210" onOtpSent={mockOnOtpSent} />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnOtpSent).toHaveBeenCalled();
      });
    });

    it("should show success toast on successful OTP send", async () => {
      mockRequestOtp.mockResolvedValue({ success: true });

      render(<PhoneOTPForm {...defaultProps} phone="9876543210" />);

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("OTP sent to your phone!");
      });
    });

    it("should call onErrorChange when requestOtp fails", async () => {
      const mockOnErrorChange = jest.fn();
      mockRequestOtp.mockResolvedValue({ success: false, error: "Server error" });

      render(
        <PhoneOTPForm
          {...defaultProps}
          phone="9876543210"
          onErrorChange={mockOnErrorChange}
        />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnErrorChange).toHaveBeenCalledWith("Server error");
      });
    });

    it("should not submit when phone is too short (button disabled)", () => {
      const mockOnErrorChange = jest.fn();

      render(
        <PhoneOTPForm {...defaultProps} phone="123" onErrorChange={mockOnErrorChange} />
      );

      const button = screen.getByRole("button", { name: "Send OTP" });
      expect(button).toBeDisabled();
      // Since button is disabled, requestOtp should not be called
      expect(mockRequestOtp).not.toHaveBeenCalled();
    });
  });
});
