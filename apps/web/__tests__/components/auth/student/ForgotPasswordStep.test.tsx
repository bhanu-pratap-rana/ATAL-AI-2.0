/**
 * Tests for ForgotPasswordStep Component
 * Tests password reset flow with OTP verification
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/image to avoid Image component issues in tests
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: { src: string; alt: string; width?: number; height?: number; className?: string; priority?: boolean }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt} width={props.width} height={props.height} className={props.className} />;
  },
}));

// Mock dependencies before component import
const mockSendForgotPasswordOtp = jest.fn();
const mockResetPasswordWithOtp = jest.fn();
jest.mock("@/app/actions/auth", () => ({
  sendForgotPasswordOtp: mockSendForgotPasswordOtp,
  resetPasswordWithOtp: mockResetPasswordWithOtp,
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: (email: string) => {
    if (!email || !email.includes("@")) {
      return { valid: false, error: "Invalid email" };
    }
    return { valid: true };
  },
  validatePassword: (password: string) => {
    if (!password || password.length < 8) {
      return { valid: false, errors: ["Password must be at least 8 characters"] };
    }
    return { valid: true, errors: [] };
  },
  validatePasswordMatch: (password: string, confirm: string) => {
    if (password !== confirm) {
      return { valid: false, error: "Passwords do not match" };
    }
    return { valid: true };
  },
}));

// Mock useOTPInput hook
jest.mock("@/hooks/useOTPInput", () => ({
  useOTPInput: (initialValue: string) => ({
    value: initialValue,
    onChange: jest.fn(),
  }),
}));

// Mock auth constants
jest.mock("@/lib/auth-constants", () => ({
  OTP_LENGTH: 6,
}));

import { ForgotPasswordStep } from "@/components/auth/student/ForgotPasswordStep";
import { toast } from "sonner";

describe("ForgotPasswordStep Component", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setForgotPasswordEmail: jest.fn(),
    setForgotPasswordError: jest.fn(),
    setForgotPasswordStep: jest.fn(),
    setForgotPasswordOtp: jest.fn(),
    setForgotPasswordNewPassword: jest.fn(),
    setForgotPasswordNewPasswordConfirm: jest.fn(),
    resetForgotPassword: jest.fn(),
    setMainStep: jest.fn(),
    setSigninTab: jest.fn(),
    setSigninEmailAddress: jest.fn(),
  };

  const defaultState = {
    forgotPasswordStep: "email" as const,
    forgotPasswordEmail: "",
    forgotPasswordError: null,
    forgotPasswordOtp: "",
    forgotPasswordNewPassword: "",
    forgotPasswordNewPasswordConfirm: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Email Step Rendering", () => {
    it("should render email input step", () => {
      render(
        <ForgotPasswordStep
          state={defaultState}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText("Reset Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByText("Send Reset Code")).toBeInTheDocument();
    });

    it("should disable inputs when loading", () => {
      render(
        <ForgotPasswordStep
          state={defaultState}
          actions={mockActions}
          isLoading={true}
        />
      );

      expect(screen.getByLabelText("Email Address")).toBeDisabled();
      expect(screen.getByText("Sending...")).toBeInTheDocument();
    });

    it("should disable submit button when email is empty", () => {
      render(
        <ForgotPasswordStep
          state={defaultState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Send Reset Code");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Send OTP Flow", () => {
    it("should show error for invalid email", async () => {
      const { container } = render(
        <ForgotPasswordStep
          state={{ ...defaultState, forgotPasswordEmail: "invalid" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      // Get the form element directly and submit it
      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalledWith(
          "Invalid email"
        );
      });
    });

    it("should call sendForgotPasswordOtp for valid email", async () => {
      mockSendForgotPasswordOtp.mockResolvedValue({ success: true });

      render(
        <ForgotPasswordStep
          state={{ ...defaultState, forgotPasswordEmail: "test@example.com" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Send Reset Code");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSendForgotPasswordOtp).toHaveBeenCalledWith("test@example.com");
      });
    });

    it("should advance to reset step on success", async () => {
      mockSendForgotPasswordOtp.mockResolvedValue({ success: true });

      render(
        <ForgotPasswordStep
          state={{ ...defaultState, forgotPasswordEmail: "test@example.com" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Send Reset Code");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordStep).toHaveBeenCalledWith("reset");
        expect(toast.success).toHaveBeenCalledWith("Reset code sent to your email!");
      });
    });

    it("should show error when sending OTP fails", async () => {
      mockSendForgotPasswordOtp.mockResolvedValue({
        success: false,
        error: "Email not found",
      });

      render(
        <ForgotPasswordStep
          state={{ ...defaultState, forgotPasswordEmail: "notfound@example.com" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Send Reset Code");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalledWith(
          "Email not found"
        );
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Reset Step Rendering", () => {
    const resetState = {
      ...defaultState,
      forgotPasswordStep: "reset" as const,
      forgotPasswordEmail: "test@example.com",
    };

    it("should render reset password form", () => {
      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText("Create New Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Reset Code")).toBeInTheDocument();
      expect(screen.getByLabelText("New Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    });

    it("should show email hint for OTP", () => {
      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });

    it("should disable submit when fields are empty", () => {
      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Reset Password Flow", () => {
    const resetState = {
      ...defaultState,
      forgotPasswordStep: "reset" as const,
      forgotPasswordEmail: "test@example.com",
      forgotPasswordOtp: "123456",
      forgotPasswordNewPassword: "newPassword123",
      forgotPasswordNewPasswordConfirm: "newPassword123",
    };

    it("should show error for weak password", async () => {
      render(
        <ForgotPasswordStep
          state={{ ...resetState, forgotPasswordNewPassword: "weak" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalledWith(
          expect.stringContaining("8 characters")
        );
      });
    });

    it("should show error for mismatched passwords", async () => {
      render(
        <ForgotPasswordStep
          state={{
            ...resetState,
            forgotPasswordNewPasswordConfirm: "differentPassword",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalledWith(
          "Passwords do not match"
        );
      });
    });

    it("should call resetPasswordWithOtp with correct params", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({ success: true });

      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockResetPasswordWithOtp).toHaveBeenCalledWith(
          "test@example.com",
          "123456",
          "newPassword123"
        );
      });
    });

    it("should show success and navigate to signin on successful reset", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({ success: true });

      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("successful")
        );
        expect(mockActions.resetForgotPassword).toHaveBeenCalled();
      });

      // Fast-forward timers for the setTimeout
      jest.advanceTimersByTime(1500);

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signin");
      expect(mockActions.setSigninTab).toHaveBeenCalledWith("email");
      expect(mockActions.setSigninEmailAddress).toHaveBeenCalledWith(
        "test@example.com"
      );
    });

    it("should show error when reset fails", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({
        success: false,
        error: "Invalid OTP",
      });

      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalledWith(
          "Invalid OTP"
        );
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("should show expired message for expired OTP", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({
        success: false,
        error: "Token has expired",
      });

      render(
        <ForgotPasswordStep
          state={resetState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const submitButton = screen.getByText("Reset Password");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalledWith(
          expect.stringContaining("expired")
        );
      });
    });
  });

  describe("Error Display", () => {
    it("should display error message in email step", () => {
      render(
        <ForgotPasswordStep
          state={{ ...defaultState, forgotPasswordError: "Email not found" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText("Email not found")).toBeInTheDocument();
    });

    it("should display error message in reset step", () => {
      render(
        <ForgotPasswordStep
          state={{
            ...defaultState,
            forgotPasswordStep: "reset",
            forgotPasswordError: "Invalid code",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to signin when clicking sign in link", () => {
      render(
        <ForgotPasswordStep
          state={defaultState}
          actions={mockActions}
          isLoading={false}
        />
      );

      const signInLink = screen.getByText("Sign in");
      fireEvent.click(signInLink);

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signin");
    });

    it("should navigate back from reset step", () => {
      render(
        <ForgotPasswordStep
          state={{ ...defaultState, forgotPasswordStep: "reset" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const backButton = screen.getByText("Back to sign in");
      fireEvent.click(backButton);

      expect(mockActions.resetForgotPassword).toHaveBeenCalled();
      expect(mockActions.setMainStep).toHaveBeenCalledWith("signin");
    });
  });
});
