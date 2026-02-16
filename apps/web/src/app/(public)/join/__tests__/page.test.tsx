/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/image before importing component
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt} />;
  },
}));

import JoinClassPage from "../page";

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new Map();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock supabase
const mockSignInAnonymously = jest.fn();
const mockGetSession = jest.fn();
const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      signInAnonymously: mockSignInAnonymously,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
  })),
}));

// Mock auth handlers
jest.mock("@/lib/auth-handlers", () => ({
  handleSendOTP: jest.fn(),
  handleVerifyOTP: jest.fn(),
}));

// Mock student actions
jest.mock("@/app/actions/student", () => ({
  joinClass: jest.fn(),
  previewClass: jest.fn(),
}));

// Mock hooks
jest.mock("@/hooks/usePhoneInput", () => ({
  usePhoneInput: jest.fn(() => ({
    displayValue: "9876543210",
    fullValue: "+919876543210",
    onChange: jest.fn(),
  })),
}));

jest.mock("@/hooks/useOTPInput", () => ({
  useOTPInput: jest.fn(() => ({
    value: "123456",
    onChange: jest.fn(),
  })),
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { toast } from "sonner";
import { handleSendOTP, handleVerifyOTP } from "@/lib/auth-handlers";
import { joinClass, previewClass } from "@/app/actions/student";

describe("JoinClassPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.clear();
    mockSearchParams.set("via", "invite");
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  describe("Loading State", () => {
    it("shows loading state initially", () => {
      mockGetSession.mockImplementation(() => new Promise(() => {}));

      render(<JoinClassPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe("Auth Selection Step", () => {
    it("renders auth selection options for unauthenticated users", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      // Wait for the phone button to appear (specific to auth selection step)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue with phone/i })).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
    });

    it("shows info message about sign in requirement", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByText(/you need to sign in first/i)).toBeInTheDocument();
      });
    });

    it("shows link to student start page", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      });
    });
  });

  describe("Anonymous Auth", () => {
    it("signs in anonymously when guest button clicked", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInAnonymously.mockResolvedValue({ error: null });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

      await waitFor(() => {
        expect(mockSignInAnonymously).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Signed in as guest!");
      });
    });

    it("handles anonymous auth error", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInAnonymously.mockResolvedValue({ error: { message: "Auth failed" } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Auth failed");
      });
    });
  });

  describe("Phone OTP Flow", () => {
    it("shows phone input form when phone auth selected", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue with phone/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue with phone/i }));

      await waitFor(() => {
        expect(screen.getByText(/phone sign-in/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      });
    });

    it("sends OTP when form submitted", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (handleSendOTP as jest.Mock).mockResolvedValue({ success: true });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue with phone/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue with phone/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /send otp/i })).toBeInTheDocument();
      });

      const form = screen.getByRole("button", { name: /send otp/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(handleSendOTP).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("OTP sent to your phone!");
      });
    });

    it("handles OTP send failure", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      (handleSendOTP as jest.Mock).mockResolvedValue({ success: false, error: "Failed to send" });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue with phone/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue with phone/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /send otp/i })).toBeInTheDocument();
      });

      const form = screen.getByRole("button", { name: /send otp/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to send");
      });
    });

    it("shows back button in phone form", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /continue with phone/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue with phone/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back to options/i })).toBeInTheDocument();
      });
    });
  });

  describe("Join Class Form - Authenticated", () => {
    it("shows join form for authenticated users", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/class pin/i)).toBeInTheDocument();
      });
    });

    it("previews class when 6-character code entered", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });
      (previewClass as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          className: "Math 101",
          teacherName: "Mr. Smith",
          subject: "Mathematics",
          studentCount: 25
        }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/class code/i);
      await userEvent.type(codeInput, "ABC123");

      await waitFor(() => {
        expect(previewClass).toHaveBeenCalledWith("ABC123");
        expect(screen.getByText("Class Found!")).toBeInTheDocument();
        expect(screen.getByText("Math 101")).toBeInTheDocument();
        expect(screen.getByText("Mr. Smith")).toBeInTheDocument();
      });
    });

    it("shows preview error for invalid class code", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });
      (previewClass as jest.Mock).mockResolvedValue({
        success: false,
        error: "Class not found"
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/class code/i);
      await userEvent.type(codeInput, "INVALID");

      await waitFor(() => {
        expect(screen.getByText("Class not found")).toBeInTheDocument();
      });
    });

    it("joins class successfully", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });
      (previewClass as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          className: "Math 101",
          teacherName: "Mr. Smith",
          subject: "Mathematics",
          studentCount: 25
        }
      });
      (joinClass as jest.Mock).mockResolvedValue({ success: true });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/class code/i);
      await userEvent.type(codeInput, "ABC123");

      await waitFor(() => {
        expect(screen.getByText("Class Found!")).toBeInTheDocument();
      });

      const pinInput = screen.getByLabelText(/class pin/i);
      await userEvent.type(pinInput, "1234");

      // First submit shows confirmation
      const submitButton = screen.getByRole("button", { name: /join class/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/ready to join/i)).toBeInTheDocument();
      });

      // Second submit confirms
      fireEvent.click(screen.getByRole("button", { name: /confirm & join class/i }));

      await waitFor(() => {
        expect(joinClass).toHaveBeenCalledWith({
          classCode: "ABC123",
          pin: "1234"
        });
        expect(toast.success).toHaveBeenCalledWith("Successfully joined class!");
        expect(mockPush).toHaveBeenCalledWith("/app/student/classes");
      });
    });

    it("handles join class failure", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });
      (previewClass as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          className: "Math 101",
          teacherName: "Mr. Smith",
          subject: null,
          studentCount: 25
        }
      });
      (joinClass as jest.Mock).mockResolvedValue({
        success: false,
        error: "Invalid PIN"
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/class code/i);
      await userEvent.type(codeInput, "ABC123");

      await waitFor(() => {
        expect(screen.getByText("Class Found!")).toBeInTheDocument();
      });

      const pinInput = screen.getByLabelText(/class pin/i);
      await userEvent.type(pinInput, "1234");

      // First submit
      fireEvent.click(screen.getByRole("button", { name: /join class/i }));

      await waitFor(() => {
        expect(screen.getByText(/ready to join/i)).toBeInTheDocument();
      });

      // Confirm
      fireEvent.click(screen.getByRole("button", { name: /confirm & join class/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid PIN");
      });
    });

    it("uses code and pin from URL params", async () => {
      mockSearchParams.set("code", "URLCODE");
      mockSearchParams.set("pin", "9999");
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });
      (previewClass as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          className: "URL Class",
          teacherName: "Teacher",
          subject: null,
          studentCount: 10
        }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toHaveValue("URLCODE");
      });
    });
  });

  describe("Guest Info Box", () => {
    it("shows guest access info", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByText(/guest access/i)).toBeInTheDocument();
      });
    });
  });

  describe("Join Class Form UI Elements", () => {
    it("shows info note about roll number", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByText(/roll number/i)).toBeInTheDocument();
      });
    });

    it("converts class code to uppercase", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });
      (previewClass as jest.Mock).mockResolvedValue({ success: false, error: "Not found" });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/class code/i);
      await userEvent.type(codeInput, "abc123");

      expect(codeInput).toHaveValue("ABC123");
    });

    it("limits PIN to 4 digits", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class pin/i)).toBeInTheDocument();
      });

      const pinInput = screen.getByLabelText(/class pin/i);
      await userEvent.type(pinInput, "123456789");

      expect(pinInput).toHaveValue("1234");
    });

    it("only allows numeric input for PIN", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/class pin/i)).toBeInTheDocument();
      });

      const pinInput = screen.getByLabelText(/class pin/i);
      await userEvent.type(pinInput, "12ab34");

      expect(pinInput).toHaveValue("1234");
    });

    it("disables submit button without valid code and PIN", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } }
      });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /join class/i })).toBeDisabled();
      });
    });
  });

  describe("Redirect Behavior", () => {
    it("redirects to student start if not via invite and no code", async () => {
      mockSearchParams.clear();
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(<JoinClassPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/student/start");
      });
    });
  });
});
