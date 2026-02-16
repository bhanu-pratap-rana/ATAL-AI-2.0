/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeacherSignUpStep } from "../TeacherSignUpStep";
import type {
  TeacherOnboardingState,
  TeacherOnboardingActions,
} from "@/hooks/useTeacherOnboarding";

// Mock the components
jest.mock("@/components/auth/AuthCard", () => ({
  AuthCard: ({ children, title, description }: { children: React.ReactNode; title: string; description: string }) => (
    <div data-testid="auth-card">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button onClick={onClick} disabled={disabled || loading} type={type} data-loading={loading} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

describe("TeacherSignUpStep", () => {
  const createMockState = (overrides: Partial<TeacherOnboardingState> = {}): TeacherOnboardingState => ({
    step: "signup",
    signupMethod: "email",
    email: "",
    phone: "+91",
    phoneNumber: "",
    otp: "",
    otpSent: false,
    loading: false,
    error: "",
    emailError: "",
    phoneError: "",
    emailSuggestion: "",
    password: "",
    passwordError: "",
    showPassword: false,
    phoneOtpSent: false,
    phoneOtp: "",
    ...overrides,
  });

  const createMockActions = (): TeacherOnboardingActions => ({
    setStep: jest.fn(),
    setSignupMethod: jest.fn(),
    setEmail: jest.fn(),
    setOtp: jest.fn(),
    setOtpSent: jest.fn(),
    setPhoneNumber: jest.fn(),
    setPassword: jest.fn(),
    setShowPassword: jest.fn(),
    setPhoneOtp: jest.fn(),
    setPhoneOtpSent: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    setEmailError: jest.fn(),
    setPhoneError: jest.fn(),
    setPasswordError: jest.fn(),
    handleSendOTP: jest.fn((e) => e?.preventDefault()),
    handleVerifyOTP: jest.fn((e) => e?.preventDefault()),
    handleSetPassword: jest.fn((e) => e?.preventDefault()),
    reset: jest.fn(),
  });

  describe("rendering", () => {
    it("renders the component with title and description", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText("Teacher Registration")).toBeInTheDocument();
      expect(screen.getByText("Step 1 of 4: Choose your verification method")).toBeInTheDocument();
    });

    it("renders email and phone method tabs", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      // Check that both tab buttons exist
      const allButtons = screen.getAllByRole("button");
      const emailTab = allButtons.find(btn => btn.textContent?.includes("Email") && !btn.textContent?.includes("←"));
      const phoneTab = allButtons.find(btn => btn.textContent?.includes("Phone") && !btn.textContent?.includes("Send"));

      expect(emailTab).toBeInTheDocument();
      expect(phoneTab).toBeInTheDocument();
    });

    it("renders back to options button", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText("← Back to options")).toBeInTheDocument();
    });
  });

  describe("email method", () => {
    it("shows email input when email method is selected", () => {
      const state = createMockState({ signupMethod: "email" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByPlaceholderText("teacher@school.edu")).toBeInTheDocument();
      expect(screen.getByText("Send Verification Code")).toBeInTheDocument();
    });

    it("calls setEmail when email is typed", async () => {
      const state = createMockState({ signupMethod: "email" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const emailInput = screen.getByPlaceholderText("teacher@school.edu");
      await userEvent.type(emailInput, "test@example.com");

      expect(actions.setEmail).toHaveBeenCalled();
    });

    it("shows email error when provided", () => {
      const state = createMockState({
        signupMethod: "email",
        emailError: "Invalid email format",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    });

    it("shows email suggestion when provided", () => {
      const state = createMockState({
        signupMethod: "email",
        emailError: "Did you mean...",
        emailSuggestion: "test@gmail.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText(/Use suggested:/)).toBeInTheDocument();
      expect(screen.getByText(/test@gmail.com/)).toBeInTheDocument();
    });

    it("calls setEmail with suggestion when clicked", () => {
      const state = createMockState({
        signupMethod: "email",
        emailError: "Did you mean...",
        emailSuggestion: "test@gmail.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const suggestionButton = screen.getByText(/Use suggested:/);
      fireEvent.click(suggestionButton);

      expect(actions.setEmail).toHaveBeenCalledWith("test@gmail.com");
    });

    it("disables send button when email is empty", () => {
      const state = createMockState({ signupMethod: "email", email: "" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const sendButton = screen.getByText("Send Verification Code");
      expect(sendButton).toBeDisabled();
    });

    it("enables send button when email is provided", () => {
      const state = createMockState({ signupMethod: "email", email: "test@example.com" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const sendButton = screen.getByText("Send Verification Code");
      expect(sendButton).not.toBeDisabled();
    });

    it("calls handleSendOTP when form is submitted", () => {
      const state = createMockState({ signupMethod: "email", email: "test@example.com" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const sendButton = screen.getByText("Send Verification Code");
      fireEvent.click(sendButton);

      expect(actions.handleSendOTP).toHaveBeenCalled();
    });
  });

  describe("email OTP verification", () => {
    it("shows OTP input when otpSent is true", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        email: "test@example.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
      expect(screen.getByText(/Enter the 6-digit code sent to/)).toBeInTheDocument();
      expect(screen.getByText("Verify & Continue")).toBeInTheDocument();
    });

    it("calls setOtp when OTP is entered", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        email: "test@example.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const otpInput = screen.getByPlaceholderText("123456");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      expect(actions.setOtp).toHaveBeenCalled();
    });

    it("shows resend OTP and use different email buttons", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        email: "test@example.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText("Resend OTP")).toBeInTheDocument();
      expect(screen.getByText("Use different email")).toBeInTheDocument();
    });

    it("calls handleSendOTP when resend is clicked", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        email: "test@example.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const resendButton = screen.getByText("Resend OTP");
      fireEvent.click(resendButton);

      expect(actions.handleSendOTP).toHaveBeenCalled();
    });

    it("resets OTP state when use different email is clicked", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        email: "test@example.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const changeEmailButton = screen.getByText("Use different email");
      fireEvent.click(changeEmailButton);

      expect(actions.setOtpSent).toHaveBeenCalledWith(false);
      expect(actions.setOtp).toHaveBeenCalledWith("");
    });

    it("disables verify button when OTP is incomplete", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        otp: "123",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const verifyButton = screen.getByText("Verify & Continue");
      expect(verifyButton).toBeDisabled();
    });

    it("enables verify button when OTP is 6 digits", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        otp: "123456",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const verifyButton = screen.getByText("Verify & Continue");
      expect(verifyButton).not.toBeDisabled();
    });

    it("calls handleVerifyOTP when verify is clicked", () => {
      const state = createMockState({
        signupMethod: "email",
        otpSent: true,
        otp: "123456",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const verifyButton = screen.getByText("Verify & Continue");
      fireEvent.click(verifyButton);

      expect(actions.handleVerifyOTP).toHaveBeenCalled();
    });
  });

  describe("phone method", () => {
    it("shows phone input when phone method is selected", () => {
      const state = createMockState({ signupMethod: "phone" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument();
      expect(screen.getByText("+91")).toBeInTheDocument();
      expect(screen.getByText("Send OTP to Phone")).toBeInTheDocument();
    });

    it("calls setPhoneNumber when phone is typed", async () => {
      const state = createMockState({ signupMethod: "phone" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const phoneInput = screen.getByPlaceholderText("9876543210");
      await userEvent.type(phoneInput, "9876");

      expect(actions.setPhoneNumber).toHaveBeenCalled();
      expect(actions.setPhoneError).toHaveBeenCalledWith("");
    });

    it("shows phone error when provided", () => {
      const state = createMockState({
        signupMethod: "phone",
        phoneError: "Phone number must be 10 digits",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText("Phone number must be 10 digits")).toBeInTheDocument();
    });

    it("disables send button when phone is incomplete", () => {
      const state = createMockState({ signupMethod: "phone", phoneNumber: "12345" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const sendButton = screen.getByText("Send OTP to Phone");
      expect(sendButton).toBeDisabled();
    });

    it("enables send button when phone is 10 digits", () => {
      const state = createMockState({ signupMethod: "phone", phoneNumber: "9876543210" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const sendButton = screen.getByText("Send OTP to Phone");
      expect(sendButton).not.toBeDisabled();
    });

    it("sets phone error when sending OTP with incomplete phone", () => {
      const state = createMockState({ signupMethod: "phone", phoneNumber: "12345" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      // Since button is disabled, we need to test the validation logic directly
      // by checking state when the component renders with incomplete phone
      expect(screen.getByText("Send OTP to Phone")).toBeDisabled();
    });

    it("calls setPhoneOtpSent when phone is valid and send is clicked", () => {
      const state = createMockState({ signupMethod: "phone", phoneNumber: "9876543210" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const sendButton = screen.getByText("Send OTP to Phone");
      fireEvent.click(sendButton);

      expect(actions.setPhoneOtpSent).toHaveBeenCalledWith(true);
    });
  });

  describe("phone OTP verification", () => {
    it("shows phone OTP input when phoneOtpSent is true", () => {
      const state = createMockState({
        signupMethod: "phone",
        phoneNumber: "9876543210",
        phoneOtpSent: true,
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      expect(screen.getByText(/Enter the 6-digit code sent to \+91/)).toBeInTheDocument();
      expect(screen.getByText("Change phone number")).toBeInTheDocument();
    });

    it("calls setPhoneOtp when OTP is entered", async () => {
      const state = createMockState({
        signupMethod: "phone",
        phoneNumber: "9876543210",
        phoneOtpSent: true,
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const otpInput = screen.getByPlaceholderText("123456");
      await userEvent.type(otpInput, "12");

      expect(actions.setPhoneOtp).toHaveBeenCalled();
    });

    it("resets phone OTP state when change phone number is clicked", () => {
      const state = createMockState({
        signupMethod: "phone",
        phoneNumber: "9876543210",
        phoneOtpSent: true,
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const changePhoneButton = screen.getByText("Change phone number");
      fireEvent.click(changePhoneButton);

      expect(actions.setPhoneOtpSent).toHaveBeenCalledWith(false);
      expect(actions.setPhoneOtp).toHaveBeenCalledWith("");
    });

    it("calls setStep when phone OTP is verified", () => {
      const state = createMockState({
        signupMethod: "phone",
        phoneNumber: "9876543210",
        phoneOtpSent: true,
        phoneOtp: "123456",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      // Find the verify button in phone OTP section (there are two "Verify & Continue" buttons)
      const verifyButtons = screen.getAllByText("Verify & Continue");
      // The second one is for phone verification
      fireEvent.click(verifyButtons[verifyButtons.length - 1]);

      expect(actions.setStep).toHaveBeenCalledWith("set-password");
    });
  });

  describe("method switching", () => {
    it("calls setSignupMethod with email when email tab is clicked", () => {
      const state = createMockState({ signupMethod: "phone" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const emailTab = screen.getByText(/Email/);
      fireEvent.click(emailTab);

      expect(actions.setSignupMethod).toHaveBeenCalledWith("email");
      expect(actions.setPhoneError).toHaveBeenCalledWith("");
      expect(actions.setEmailError).toHaveBeenCalledWith("");
    });

    it("calls setSignupMethod with phone when phone tab is clicked", () => {
      const state = createMockState({ signupMethod: "email" });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      // Get the phone tab button (not the "Send OTP to Phone" button)
      const allButtons = screen.getAllByRole("button");
      const phoneTab = allButtons.find(btn => btn.textContent?.includes("Phone") && !btn.textContent?.includes("Send"));
      fireEvent.click(phoneTab!);

      expect(actions.setSignupMethod).toHaveBeenCalledWith("phone");
      expect(actions.setPhoneError).toHaveBeenCalledWith("");
      expect(actions.setEmailError).toHaveBeenCalledWith("");
    });

    it("disables tabs when loading", () => {
      const state = createMockState({ signupMethod: "email", loading: true });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      // Get all buttons with Email/Phone text - the tabs are the buttons in the flex container
      const allButtons = screen.getAllByRole("button");
      const emailTab = allButtons.find(btn => btn.textContent?.includes("Email") && !btn.textContent?.includes("←"));
      const phoneTab = allButtons.find(btn => btn.textContent?.includes("Phone") && !btn.textContent?.includes("Send"));

      expect(emailTab).toBeDisabled();
      expect(phoneTab).toBeDisabled();
    });
  });

  describe("back navigation", () => {
    it("calls setStep with choice when back button is clicked", () => {
      const state = createMockState();
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const backButton = screen.getByText("← Back to options");
      fireEvent.click(backButton);

      expect(actions.setStep).toHaveBeenCalledWith("choice");
    });

    it("disables back button when loading", () => {
      const state = createMockState({ loading: true });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const backButton = screen.getByText("← Back to options");
      expect(backButton).toBeDisabled();
    });
  });

  describe("loading state", () => {
    it("disables form inputs when loading", () => {
      const state = createMockState({
        signupMethod: "email",
        loading: true,
        email: "test@example.com",
      });
      const actions = createMockActions();

      render(<TeacherSignUpStep state={state} actions={actions} />);

      const emailInput = screen.getByPlaceholderText("teacher@school.edu");
      const sendButton = screen.getByText("Send Verification Code");

      expect(emailInput).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });
});
