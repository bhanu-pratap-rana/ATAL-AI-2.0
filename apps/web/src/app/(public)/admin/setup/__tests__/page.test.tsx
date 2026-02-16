/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminSetupPage from "../page";

// Mock the admin actions
const mockSetAdminRole = jest.fn();
const mockCheckAdminRoleByEmail = jest.fn();

jest.mock("@/app/actions/admin", () => ({
  setAdminRole: (...args: unknown[]) => mockSetAdminRole(...args),
  checkAdminRoleByEmail: (...args: unknown[]) => mockCheckAdminRoleByEmail(...args),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Loader2: () => <span data-testid="loader-icon">Loader2</span>,
}));

// Mock AuthCard component
jest.mock("@/components/auth/AuthCard", () => ({
  AuthCard: ({ children, title, description }: { children: React.ReactNode; title: string; description: string }) => (
    <div data-testid="auth-card">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

// Mock AdminRoleCheckResult component
jest.mock("@/components/admin/AdminRoleCheckResult", () => ({
  AdminRoleCheckResult: ({ isAdmin }: { isAdmin: boolean }) => (
    <div data-testid="admin-role-check-result">
      {isAdmin ? "Has admin role" : "No admin role"}
    </div>
  ),
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Mock Input component
jest.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// Mock Label component
jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

describe("AdminSetupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the page with default email", () => {
      render(<AdminSetupPage />);

      expect(screen.getByText("Admin Role Setup")).toBeInTheDocument();
      expect(screen.getByText("Set admin role for a user account to enable admin login")).toBeInTheDocument();

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveValue("atal.app.ai@gmail.com");
    });

    it("renders back to login button", () => {
      render(<AdminSetupPage />);

      expect(screen.getByText("← Back to Login")).toBeInTheDocument();
    });

    it("renders check status and set admin role buttons", () => {
      render(<AdminSetupPage />);

      expect(screen.getByText("Check Status")).toBeInTheDocument();
      expect(screen.getByText("Set Admin Role")).toBeInTheDocument();
    });
  });

  describe("handleSetAdminRole", () => {
    it("disables button when email is empty", async () => {
      render(<AdminSetupPage />);

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      await userEvent.clear(emailInput);

      const setRoleButton = screen.getByText("Set Admin Role");
      expect(setRoleButton).toBeDisabled();
      expect(mockSetAdminRole).not.toHaveBeenCalled();
    });

    it("calls setAdminRole and shows success message on success", async () => {
      mockSetAdminRole.mockResolvedValue({
        success: true,
        message: "Admin role set successfully!",
      });

      render(<AdminSetupPage />);

      const setRoleButton = screen.getByText("Set Admin Role");
      fireEvent.click(setRoleButton);

      await waitFor(() => {
        expect(mockSetAdminRole).toHaveBeenCalledWith("atal.app.ai@gmail.com");
      });

      await waitFor(() => {
        expect(screen.getByText("Admin role set successfully!")).toBeInTheDocument();
      });
    });

    it("shows error message when setAdminRole fails", async () => {
      mockSetAdminRole.mockResolvedValue({
        success: false,
        error: "User not found",
      });

      render(<AdminSetupPage />);

      const setRoleButton = screen.getByText("Set Admin Role");
      fireEvent.click(setRoleButton);

      await waitFor(() => {
        expect(screen.getByText("User not found")).toBeInTheDocument();
      });
    });

    it("shows default error message when no error provided", async () => {
      mockSetAdminRole.mockResolvedValue({
        success: false,
      });

      render(<AdminSetupPage />);

      const setRoleButton = screen.getByText("Set Admin Role");
      fireEvent.click(setRoleButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to set admin role")).toBeInTheDocument();
      });
    });

    it("handles exception during setAdminRole", async () => {
      mockSetAdminRole.mockRejectedValue(new Error("Network error"));

      render(<AdminSetupPage />);

      const setRoleButton = screen.getByText("Set Admin Role");
      fireEvent.click(setRoleButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("handles non-Error exception during setAdminRole", async () => {
      mockSetAdminRole.mockRejectedValue("String error");

      render(<AdminSetupPage />);

      const setRoleButton = screen.getByText("Set Admin Role");
      fireEvent.click(setRoleButton);

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("handleCheckAdminRole", () => {
    it("disables button when email is empty", async () => {
      render(<AdminSetupPage />);

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      await userEvent.clear(emailInput);

      const checkButton = screen.getByText("Check Status");
      expect(checkButton).toBeDisabled();
      expect(mockCheckAdminRoleByEmail).not.toHaveBeenCalled();
    });

    it("shows success message when user has admin role", async () => {
      mockCheckAdminRoleByEmail.mockResolvedValue({
        hasAdminRole: true,
      });

      render(<AdminSetupPage />);

      const checkButton = screen.getByText("Check Status");
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockCheckAdminRoleByEmail).toHaveBeenCalledWith("atal.app.ai@gmail.com");
      });

      await waitFor(() => {
        expect(screen.getByText("atal.app.ai@gmail.com has admin role ✓")).toBeInTheDocument();
      });

      expect(screen.getByTestId("admin-role-check-result")).toHaveTextContent("Has admin role");
    });

    it("shows error message when user does not have admin role", async () => {
      mockCheckAdminRoleByEmail.mockResolvedValue({
        hasAdminRole: false,
      });

      render(<AdminSetupPage />);

      const checkButton = screen.getByText("Check Status");
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText("atal.app.ai@gmail.com does NOT have admin role yet")).toBeInTheDocument();
      });

      expect(screen.getByTestId("admin-role-check-result")).toHaveTextContent("No admin role");
    });

    it("shows custom error message when provided", async () => {
      mockCheckAdminRoleByEmail.mockResolvedValue({
        hasAdminRole: false,
        error: "User does not exist",
      });

      render(<AdminSetupPage />);

      const checkButton = screen.getByText("Check Status");
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText("User does not exist")).toBeInTheDocument();
      });
    });

    it("handles exception during checkAdminRoleByEmail", async () => {
      mockCheckAdminRoleByEmail.mockRejectedValue(new Error("Connection failed"));

      render(<AdminSetupPage />);

      const checkButton = screen.getByText("Check Status");
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
      });
    });

    it("handles non-Error exception during checkAdminRoleByEmail", async () => {
      mockCheckAdminRoleByEmail.mockRejectedValue("String error");

      render(<AdminSetupPage />);

      const checkButton = screen.getByText("Check Status");
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("email input", () => {
    it("updates email value when user types", async () => {
      render(<AdminSetupPage />);

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("converts email to lowercase when calling actions", async () => {
      mockSetAdminRole.mockResolvedValue({ success: true });

      render(<AdminSetupPage />);

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "TEST@EXAMPLE.COM");

      const setRoleButton = screen.getByText("Set Admin Role");
      fireEvent.click(setRoleButton);

      await waitFor(() => {
        expect(mockSetAdminRole).toHaveBeenCalledWith("test@example.com");
      });
    });
  });

  describe("back to login button", () => {
    it("renders and is clickable", () => {
      render(<AdminSetupPage />);

      const backButton = screen.getByText("← Back to Login");
      expect(backButton).toBeInTheDocument();
      expect(backButton).not.toBeDisabled();

      // The button sets location.href, which we can't easily test in jsdom
      // but we can verify the button exists and is interactive
      fireEvent.click(backButton);
    });
  });
});
