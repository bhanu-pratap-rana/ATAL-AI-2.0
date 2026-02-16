/**
 * Tests for OTPVerificationForm component
 * Target: ~15 tests covering OTP verification behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OTPVerificationForm } from "@/components/auth/OTPVerificationForm";

// Mock toast
const mockToastSuccess = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    get success() {
      return mockToastSuccess;
    },
  },
}));

// Mock form-component-utils
jest.mock("@/lib/form-component-utils", () => ({
  useFormSubmission: (handler: () => Promise<void>, onError: (error: string | null) => void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await handler();
      } catch (error) {
        onError(error instanceof Error ? error.message : "An error occurred");
      }
    };
  },
  FORM_TOAST_MESSAGES: {
    OTP_VERIFIED: "OTP verified successfully!",
  },
}));

// Mock Button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    type,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    type?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <button type={type as "submit" | "button"} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

// Mock Label
jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

// Mock OTPInput
jest.mock("@/components/auth/OTPInput", () => ({
  OTPInput: ({
    id,
    value,
    onChange,
    disabled,
    error,
    helperText,
  }: {
    id: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    autoFocus?: boolean;
  }) => (
    <div data-testid="otp-input">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-error={error}
        placeholder="Enter OTP"
      />
      {error && <span data-testid="error">{error}</span>}
      {helperText && !error && <span data-testid="helper">{helperText}</span>}
    </div>
  ),
}));

describe("OTPVerificationForm", () => {
  const defaultProps = {
    otp: "",
    onOtpChange: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    error: null as string | null,
    onErrorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render OTP label", () => {
      render(<OTPVerificationForm {...defaultProps} />);
      expect(screen.getByText("OTP Code")).toBeInTheDocument();
    });

    it("should render custom label", () => {
      render(<OTPVerificationForm {...defaultProps} label="Enter Code" />);
      expect(screen.getByText("Enter Code")).toBeInTheDocument();
    });

    it("should render OTP input", () => {
      render(<OTPVerificationForm {...defaultProps} />);
      expect(screen.getByTestId("otp-input")).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<OTPVerificationForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Verify OTP/i })).toBeInTheDocument();
    });

    it("should render custom submit button label", () => {
      render(
        <OTPVerificationForm {...defaultProps} submitButtonLabel="Confirm Code" />
      );
      expect(screen.getByRole("button", { name: /Confirm Code/i })).toBeInTheDocument();
    });

    it("should render helper text", () => {
      render(<OTPVerificationForm {...defaultProps} />);
      expect(screen.getByTestId("helper")).toHaveTextContent(
        "Enter the 6-digit code sent to your email"
      );
    });

    it("should render custom helper text", () => {
      render(
        <OTPVerificationForm {...defaultProps} helperText="Custom helper text" />
      );
      expect(screen.getByTestId("helper")).toHaveTextContent("Custom helper text");
    });
  });

  describe("button state", () => {
    it("should disable button when loading", () => {
      render(<OTPVerificationForm {...defaultProps} isLoading={true} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should show Verifying text when loading", () => {
      render(<OTPVerificationForm {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });

    it("should disable button when OTP is not 6 digits", () => {
      render(<OTPVerificationForm {...defaultProps} otp="123" />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should enable button when OTP is 6 digits", () => {
      render(<OTPVerificationForm {...defaultProps} otp="123456" />);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should call onSubmit with OTP when form submitted", async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <OTPVerificationForm {...defaultProps} otp="123456" onSubmit={onSubmit} />
      );

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith("123456");
      });
    });

    it("should show success toast on successful verification", async () => {
      render(<OTPVerificationForm {...defaultProps} otp="123456" />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("OTP verified successfully!");
      });
    });

    it("should call onErrorChange when OTP validation fails", async () => {
      const onErrorChange = jest.fn();
      render(
        <OTPVerificationForm {...defaultProps} otp="123" onErrorChange={onErrorChange} />
      );

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(onErrorChange).toHaveBeenCalledWith("OTP must be 6 digits");
      });
    });
  });

  describe("error display", () => {
    it("should display error message", () => {
      render(<OTPVerificationForm {...defaultProps} error="Invalid OTP" />);
      expect(screen.getByTestId("error")).toHaveTextContent("Invalid OTP");
    });
  });
});
