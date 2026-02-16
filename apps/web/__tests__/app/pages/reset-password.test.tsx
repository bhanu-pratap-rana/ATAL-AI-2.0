/**
 * Tests for Reset Password Page
 * Tests password reset flow with OTP verification
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) {
    return (
      <img
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        className={props.className}
      />
    );
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock auth-constants
jest.mock("@/lib/auth-constants", () => ({
  OTP_LENGTH: 6,
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: (email: string) => {
    if (!email || !email.includes("@")) {
      return { valid: false, error: "Invalid email" };
    }
    return { valid: true };
  },
  validatePasswordMatch: (password: string, confirm: string) => {
    if (password !== confirm) {
      return { valid: false, error: "Passwords do not match" };
    }
    return { valid: true };
  },
}));

// Mock password utils
jest.mock("@/lib/password-utils", () => ({
  getPasswordValidationError: (password: string) => {
    if (!password || password.length < 8) {
      return "Password must be at least 8 characters";
    }
    return null;
  },
}));

// Mock Supabase client
const mockGetSession = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

// Mock resetPasswordWithOtp action
const mockResetPasswordWithOtp = jest.fn();
jest.mock("@/app/actions/auth", () => ({
  resetPasswordWithOtp: (...args: unknown[]) => mockResetPasswordWithOtp(...args),
}));

import ResetPasswordPage from "@/app/(public)/reset-password/page";
import { toast } from "sonner";

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockResetPasswordWithOtp.mockResolvedValue({ success: true });
    mockSearchParams.delete("email");
  });

  describe("Rendering", () => {
    it("should render the reset password form", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Reset Password/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    it("should render submit button", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Reset Password/i })
        ).toBeInTheDocument();
      });
    });

    it("should render back to login link", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText(/Remember your password?/i)).toBeInTheDocument();
        expect(screen.getByText(/Sign in here/i)).toBeInTheDocument();
      });
    });
  });

  describe("Session Check", () => {
    it("should redirect to dashboard if already authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: { user: { id: "user-123" } },
        },
      });

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is empty", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("should show error when OTP is incomplete", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: "123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/Verification code must be 6 digits/i)).toBeInTheDocument();
      });
    });

    it("should show error when password is empty", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: "123456" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Password is required")).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: "123456" },
      });
      fireEvent.change(screen.getByLabelText(/New Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: "different123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
      });
    });
  });

  describe("OTP Input", () => {
    it("should only allow digits in OTP field", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/Verification Code/i);
      fireEvent.change(otpInput, { target: { value: "abc123def" } });

      expect(otpInput).toHaveValue("123");
    });

    it("should limit OTP to 6 digits", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/Verification Code/i);
      fireEvent.change(otpInput, { target: { value: "12345678" } });

      expect(otpInput).toHaveValue("123456");
    });
  });

  describe("Reset Password Flow", () => {
    it("should call resetPasswordWithOtp on valid submission", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: "123456" },
      });
      fireEvent.change(screen.getByLabelText(/New Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockResetPasswordWithOtp).toHaveBeenCalledWith(
          "test@example.com",
          "123456",
          "password123"
        );
      });
    });

    it("should show success message on successful reset", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: "123456" },
      });
      fireEvent.change(screen.getByLabelText(/New Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Password reset successfully")
        );
      });
    });

    it("should show error on failed reset", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({
        success: false,
        error: "Invalid verification code",
      });

      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Verification Code/i), {
        target: { value: "123456" },
      });
      fireEvent.change(screen.getByLabelText(/New Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Invalid verification code")).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to login when Sign in link is clicked", async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign in here/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Sign in here/i));

      expect(mockPush).toHaveBeenCalledWith("/student/start");
    });
  });
});
