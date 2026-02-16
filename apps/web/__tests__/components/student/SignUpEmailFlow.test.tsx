/**
 * Tests for SignUpEmailFlow component
 * Target: ~28 tests covering email signup flow
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignUpEmailFlow } from "@/components/student/SignUpEmailFlow";

// Mock dependencies
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

const mockRequestOtp = jest.fn();
jest.mock("@/app/actions/auth", () => ({
  requestOtp: (...args: unknown[]) => mockRequestOtp(...args),
}));

const mockVerifyOtp = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser,
    },
  }),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
  RefreshCw: ({ className }: { className?: string }) => <span data-testid="refresh-icon" className={className}>RefreshCw</span>,
}));

describe("SignUpEmailFlow", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setSignupEmailAddress: jest.fn(),
    setSignupEmailError: jest.fn(),
    setSignupEmailOtpSent: jest.fn(),
    setSignupEmailPassword: jest.fn(),
    setSignupEmailPasswordConfirm: jest.fn(),
    resetSignupEmail: jest.fn(),
    setMainStep: jest.fn(),
  };

  const mockOtpInput = {
    value: "",
    onChange: jest.fn(),
    reset: jest.fn(),
  };

  const defaultEmailStepState = {
    signupEmailAddress: "",
    signupEmailOtpSent: false,
    signupEmailPassword: "",
    signupEmailPasswordConfirm: "",
    signupEmailError: null as string | null,
  };

  const defaultVerifyStepState = {
    ...defaultEmailStepState,
    signupEmailAddress: "test@example.com",
    signupEmailOtpSent: true,
  };

  const defaultProps = {
    state: defaultEmailStepState,
    actions: mockActions,
    otpInput: mockOtpInput,
    isLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestOtp.mockResolvedValue({ success: true });
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "123" } }, error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  describe("email step rendering", () => {
    it("should render Email Address label", () => {
      render(<SignUpEmailFlow {...defaultProps} />);
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    });

    it("should render email placeholder", () => {
      render(<SignUpEmailFlow {...defaultProps} />);
      expect(screen.getByPlaceholderText("your.email@example.com")).toBeInTheDocument();
    });

    it("should render Send OTP button", () => {
      render(<SignUpEmailFlow {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Send OTP/i })).toBeInTheDocument();
    });
  });

  describe("email step behavior", () => {
    it("should disable Send OTP when email is empty", () => {
      render(<SignUpEmailFlow {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Send OTP/i })).toBeDisabled();
    });

    it("should enable Send OTP when email is provided", () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailAddress: "test@example.com" }}
        />
      );
      expect(screen.getByRole("button", { name: /Send OTP/i })).not.toBeDisabled();
    });

    it("should disable input when loading", () => {
      render(<SignUpEmailFlow {...defaultProps} isLoading={true} />);
      expect(screen.getByPlaceholderText("your.email@example.com")).toBeDisabled();
    });

    it("should call setSignupEmailAddress when typing", () => {
      render(<SignUpEmailFlow {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
        target: { value: "user@test.com" },
      });
      expect(mockActions.setSignupEmailAddress).toHaveBeenCalledWith("user@test.com");
    });

    it("should display error message", () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailError: "Invalid email" }}
        />
      );
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
    });
  });

  describe("email step submission", () => {
    it("should validate email on submit", async () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailAddress: "invalid-email" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupEmailError).toHaveBeenCalled();
      });
    });

    it("should call requestOtp on valid email", async () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailAddress: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockRequestOtp).toHaveBeenCalledWith("test@example.com");
      });
    });

    it("should show success toast on OTP sent", async () => {
      mockRequestOtp.mockResolvedValue({ success: true });
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailAddress: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("OTP sent to your email!");
      });
    });

    it("should set OTP sent state on success", async () => {
      mockRequestOtp.mockResolvedValue({ success: true });
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailAddress: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupEmailOtpSent).toHaveBeenCalledWith(true);
      });
    });

    it("should show error toast on OTP failure", async () => {
      mockRequestOtp.mockResolvedValue({ success: false, error: "Failed to send OTP" });
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, signupEmailAddress: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  describe("verify step rendering", () => {
    it("should render Verification Code label", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByLabelText("Verification Code")).toBeInTheDocument();
    });

    it("should render Password label", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render Confirm Password label", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    });

    it("should render Create Account button", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
    });

    it("should render Change email button", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByRole("button", { name: /Change email/i })).toBeInTheDocument();
    });

    it("should render OTP instruction text", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByText(/Enter the 6-digit code sent to your email/i)).toBeInTheDocument();
    });
  });

  describe("verify step behavior", () => {
    it("should disable Create Account when OTP is incomplete", () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupEmailPassword: "password123", signupEmailPasswordConfirm: "password123" }}
          otpInput={{ ...mockOtpInput, value: "123" }}
        />
      );
      expect(screen.getByRole("button", { name: /Create Account/i })).toBeDisabled();
    });

    it("should disable Create Account when password is empty", () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={defaultVerifyStepState}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );
      expect(screen.getByRole("button", { name: /Create Account/i })).toBeDisabled();
    });

    it("should enable Create Account when all fields are valid", () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupEmailPassword: "password123", signupEmailPasswordConfirm: "password123" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );
      expect(screen.getByRole("button", { name: /Create Account/i })).not.toBeDisabled();
    });

    it("should go back to email step when Change email is clicked", () => {
      render(<SignUpEmailFlow {...defaultProps} state={defaultVerifyStepState} />);
      fireEvent.click(screen.getByRole("button", { name: /Change email/i }));
      expect(mockActions.setSignupEmailOtpSent).toHaveBeenCalledWith(false);
      expect(mockOtpInput.reset).toHaveBeenCalled();
    });

    it("should show error message when signupEmailError is set", () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupEmailError: "Invalid OTP" }}
        />
      );
      expect(screen.getByText("Invalid OTP")).toBeInTheDocument();
    });
  });

  describe("verify step submission", () => {
    it("should validate password on submit", async () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupEmailPassword: "short", signupEmailPasswordConfirm: "short" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupEmailError).toHaveBeenCalled();
      });
    });

    it("should validate password match on submit", async () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupEmailPassword: "password123", signupEmailPasswordConfirm: "different123" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupEmailError).toHaveBeenCalled();
      });
    });

    it("should call verifyOtp on valid submission", async () => {
      render(
        <SignUpEmailFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupEmailPassword: "password123!", signupEmailPasswordConfirm: "password123!" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalled();
      });
    });
  });
});
