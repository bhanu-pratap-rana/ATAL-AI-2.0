/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock dependencies before importing component
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt} />;
  },
}));

const mockVerifyOtp = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(() => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser,
    },
  })),
}));

jest.mock("@/app/actions/auth", () => ({
  requestOtp: jest.fn(),
  registerWithUsername: jest.fn(),
}));

const mockOtpInputValue = { current: "123456" };
const mockOtpOnChange = jest.fn((val) => {
  mockOtpInputValue.current = val;
});

jest.mock("@/hooks/useOTPInput", () => ({
  useOTPInput: jest.fn(() => ({
    value: mockOtpInputValue.current,
    onChange: mockOtpOnChange,
  })),
}));

const mockPhoneValue = { current: "+919876543210" };
const mockPhoneDisplay = { current: "9876543210" };

jest.mock("@/hooks/usePhoneInput", () => ({
  usePhoneInput: jest.fn(() => ({
    displayValue: mockPhoneDisplay.current,
    fullValue: mockPhoneValue.current,
    onChange: jest.fn(),
  })),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock validation-utils to return proper values
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: jest.fn((email: string) => {
    const isValid = email.includes("@") && email.includes(".");
    return {
      valid: isValid,
      error: isValid ? undefined : "Invalid email format",
    };
  }),
  validatePassword: jest.fn((password: string) => {
    const isValid = password.length >= 8;
    return {
      valid: isValid,
      errors: isValid ? [] : ["Password must be at least 8 characters"],
    };
  }),
  validatePasswordMatch: jest.fn((password: string, confirm: string) => ({
    valid: password === confirm,
    error: password === confirm ? undefined : "Passwords do not match",
  })),
  validatePhone: jest.fn((phone: string) => ({
    valid: phone.startsWith("+") && phone.length >= 10,
    error: phone.startsWith("+") && phone.length >= 10 ? undefined : "Invalid phone number",
  })),
}));

// Import component after mocks
import { SignUpStep } from "../SignUpStep";

import { toast } from "sonner";
import { requestOtp, registerWithUsername } from "@/app/actions/auth";

// Helper to create mock state
function createMockState(overrides = {}) {
  return {
    signupTab: "email" as const,
    signupEmailAddress: "",
    signupEmailOtpSent: false,
    signupEmailOtp: "",
    signupEmailPassword: "",
    signupEmailPasswordConfirm: "",
    signupEmailError: null as string | null,
    signupPhoneNumber: "",
    signupPhoneOtpStep: "phone" as const,
    signupPhoneOtp: "",
    signupPhoneError: null as string | null,
    signupUsername: "",
    signupUsernamePassword: "",
    signupUsernameError: null as string | null,
    ...overrides,
  };
}

// Helper to create mock actions
function createMockActions() {
  return {
    setIsLoading: jest.fn(),
    setSignupTab: jest.fn(),
    setSignupEmailAddress: jest.fn(),
    setSignupEmailOtpSent: jest.fn(),
    setSignupEmailOtp: jest.fn(),
    setSignupEmailPassword: jest.fn(),
    setSignupEmailPasswordConfirm: jest.fn(),
    setSignupEmailError: jest.fn(),
    setSignupPhoneNumber: jest.fn(),
    setSignupPhoneOtpStep: jest.fn(),
    setSignupPhoneOtp: jest.fn(),
    setSignupPhoneError: jest.fn(),
    setSignupUsername: jest.fn(),
    setSignupUsernamePassword: jest.fn(),
    setSignupUsernameError: jest.fn(),
    setSigninEmailAddress: jest.fn(),
    setSigninPhoneNumber: jest.fn(),
    setMainStep: jest.fn(),
    setSigninTab: jest.fn(),
    resetSignupEmail: jest.fn(),
    resetSignupPhone: jest.fn(),
    resetSignupUsername: jest.fn(),
  };
}

describe("SignUpStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyOtp.mockReset();
    mockUpdateUser.mockReset();
    mockOtpInputValue.current = "123456";
  });

  describe("Tab Navigation", () => {
    it("renders all three signup tabs", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByRole("button", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /phone/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /quick start/i })).toBeInTheDocument();
    });

    it("switches to phone tab when clicked", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      fireEvent.click(screen.getByRole("button", { name: /phone/i }));
      expect(actions.setSignupTab).toHaveBeenCalledWith("phone");
    });

    it("switches to guest tab when clicked", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      fireEvent.click(screen.getByRole("button", { name: /quick start/i }));
      expect(actions.setSignupTab).toHaveBeenCalledWith("guest");
    });

    it("disables tabs when loading", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={true} />);

      expect(screen.getByRole("button", { name: /email/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /phone/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /quick start/i })).toBeDisabled();
    });
  });

  describe("Email Sign Up - Send OTP", () => {
    it("renders email input form initially", () => {
      const state = createMockState({ signupTab: "email" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send verification code/i })).toBeInTheDocument();
    });

    it("handles email input change", async () => {
      const state = createMockState({ signupTab: "email" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, "test@example.com");

      expect(actions.setSignupEmailAddress).toHaveBeenCalled();
    });

    it("shows error for invalid email", async () => {
      const state = createMockState({
        signupTab: "email",
        signupEmailAddress: "invalid-email",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /send verification code/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupEmailError).toHaveBeenCalled();
      });
    });

    it("sends OTP successfully for valid email", async () => {
      (requestOtp as jest.Mock).mockResolvedValue({ success: true });

      const state = createMockState({
        signupTab: "email",
        signupEmailAddress: "test@example.com",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /send verification code/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(requestOtp).toHaveBeenCalledWith("test@example.com");
        expect(toast.success).toHaveBeenCalledWith("OTP sent to your email!");
        expect(actions.setSignupEmailOtpSent).toHaveBeenCalledWith(true);
      });
    });

    it("handles existing email for teacher/admin", async () => {
      (requestOtp as jest.Mock).mockResolvedValue({
        success: false,
        exists: true,
        role: "teacher",
        error: "Please use the teacher login page.",
      });

      const state = createMockState({
        signupTab: "email",
        signupEmailAddress: "teacher@example.com",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /send verification code/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupEmailError).toHaveBeenCalledWith("Please use the teacher login page.");
      });
    });

    it("handles existing email for student - redirects to signin", async () => {
      (requestOtp as jest.Mock).mockResolvedValue({
        success: false,
        exists: true,
        role: "student",
      });

      const state = createMockState({
        signupTab: "email",
        signupEmailAddress: "student@example.com",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /send verification code/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSigninEmailAddress).toHaveBeenCalledWith("student@example.com");
        expect(actions.setMainStep).toHaveBeenCalledWith("signin");
        expect(actions.setSigninTab).toHaveBeenCalledWith("email");
      });
    });

    it("displays error message when present", () => {
      const state = createMockState({
        signupTab: "email",
        signupEmailError: "Invalid email format",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    });
  });

  describe("Email Sign Up - Verify OTP", () => {
    it("renders OTP verification form after OTP sent", () => {
      const state = createMockState({
        signupTab: "email",
        signupEmailOtpSent: true,
        signupEmailAddress: "test@example.com",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("validates password requirements", async () => {
      const state = createMockState({
        signupTab: "email",
        signupEmailOtpSent: true,
        signupEmailPassword: "short",
        signupEmailPasswordConfirm: "short",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupEmailError).toHaveBeenCalled();
      });
    });

    it("validates password match", async () => {
      const state = createMockState({
        signupTab: "email",
        signupEmailOtpSent: true,
        signupEmailPassword: "ValidPass123!",
        signupEmailPasswordConfirm: "DifferentPass123!",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupEmailError).toHaveBeenCalled();
      });
    });

    it("creates account successfully after OTP verification", async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockUpdateUser.mockResolvedValue({ error: null });

      const state = createMockState({
        signupTab: "email",
        signupEmailOtpSent: true,
        signupEmailAddress: "test@example.com",
        signupEmailPassword: "ValidPass123!",
        signupEmailPasswordConfirm: "ValidPass123!",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Account created! Now set up your profile.");
        expect(actions.setMainStep).toHaveBeenCalledWith("profile");
      });
    });

    it("handles OTP verification failure", async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: null },
        error: { message: "OTP expired" },
      });

      const state = createMockState({
        signupTab: "email",
        signupEmailOtpSent: true,
        signupEmailAddress: "test@example.com",
        signupEmailPassword: "ValidPass123!",
        signupEmailPasswordConfirm: "ValidPass123!",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupEmailError).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Phone Sign Up - Send OTP", () => {
    it("renders phone input form", () => {
      const state = createMockState({ signupTab: "phone" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send verification code/i })).toBeInTheDocument();
    });

    it("sends OTP to phone successfully", async () => {
      (requestOtp as jest.Mock).mockResolvedValue({ success: true });

      const state = createMockState({
        signupTab: "phone",
        signupPhoneNumber: "+919876543210",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /send verification code/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(requestOtp).toHaveBeenCalledWith("+919876543210");
        expect(toast.success).toHaveBeenCalledWith("OTP sent to your phone!");
        expect(actions.setSignupPhoneOtpStep).toHaveBeenCalledWith("verify");
      });
    });

    it("handles existing phone for teacher/admin", async () => {
      (requestOtp as jest.Mock).mockResolvedValue({
        success: false,
        exists: true,
        role: "admin",
      });

      const state = createMockState({
        signupTab: "phone",
        signupPhoneNumber: "+919876543210",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /send verification code/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupPhoneError).toHaveBeenCalled();
      });
    });
  });

  describe("Phone Sign Up - Verify OTP", () => {
    it("renders OTP verification form for phone", () => {
      const state = createMockState({
        signupTab: "phone",
        signupPhoneOtpStep: "verify",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /verify & continue/i })).toBeInTheDocument();
    });

    it("verifies phone OTP successfully", async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const state = createMockState({
        signupTab: "phone",
        signupPhoneOtpStep: "verify",
        signupPhoneNumber: "+919876543210",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /verify & continue/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Phone verified! Now set up your profile.");
        expect(actions.setMainStep).toHaveBeenCalledWith("profile");
      });
    });
  });

  describe("Username (Quick Start) Sign Up", () => {
    it("renders username form", () => {
      const state = createMockState({ signupTab: "guest" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("validates empty username", async () => {
      const state = createMockState({
        signupTab: "guest",
        signupUsername: "   ",
        signupUsernamePassword: "ValidPass123!",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupUsernameError).toHaveBeenCalledWith("Username is required");
      });
    });

    it("validates password requirements for username signup", async () => {
      const state = createMockState({
        signupTab: "guest",
        signupUsername: "testuser",
        signupUsernamePassword: "short",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupUsernameError).toHaveBeenCalled();
      });
    });

    it("creates account with username successfully", async () => {
      (registerWithUsername as jest.Mock).mockResolvedValue({ success: true });

      const state = createMockState({
        signupTab: "guest",
        signupUsername: "testuser",
        signupUsernamePassword: "ValidPass123!",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(registerWithUsername).toHaveBeenCalledWith("testuser", "ValidPass123!");
        expect(toast.success).toHaveBeenCalledWith("Account created! Now set up your profile.");
        expect(actions.setMainStep).toHaveBeenCalledWith("profile");
      });
    });

    it("handles username registration failure", async () => {
      (registerWithUsername as jest.Mock).mockResolvedValue({
        success: false,
        error: "Username already taken",
      });

      const state = createMockState({
        signupTab: "guest",
        signupUsername: "existinguser",
        signupUsernamePassword: "ValidPass123!",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      const form = screen.getByRole("button", { name: /create account/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(actions.setSignupUsernameError).toHaveBeenCalledWith("Username already taken");
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("displays username error message", () => {
      const state = createMockState({
        signupTab: "guest",
        signupUsernameError: "Username already taken",
      });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByText("Username already taken")).toBeInTheDocument();
    });
  });

  describe("Sign In Link", () => {
    it("shows sign in link in email form", () => {
      const state = createMockState({ signupTab: "email" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("navigates to signin when clicking sign in link", () => {
      const state = createMockState({ signupTab: "email" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={false} />);

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
      expect(actions.setMainStep).toHaveBeenCalledWith("signin");
    });
  });

  describe("Loading States", () => {
    it("shows loading state in email send button", () => {
      const state = createMockState({ signupTab: "email" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={true} />);

      expect(screen.getByRole("button", { name: /sending code/i })).toBeInTheDocument();
    });

    it("disables form inputs when loading", () => {
      const state = createMockState({ signupTab: "email" });
      const actions = createMockActions();

      render(<SignUpStep state={state} actions={actions} isLoading={true} />);

      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    });
  });
});
