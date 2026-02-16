/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateAdminPage from "../page";

// Mock the admin auth actions
const mockCreateAdminUser = jest.fn();
const mockCheckAdminExists = jest.fn();

jest.mock("@/app/actions/admin-auth", () => ({
  createAdminUser: (...args: unknown[]) => mockCreateAdminUser(...args),
  checkAdminExists: () => mockCheckAdminExists(),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ui-timings
jest.mock("@/lib/constants/ui-timings", () => ({
  FORM_TIMING: {
    nextStepsDelay: 100,
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Loader2: () => <span data-testid="loader-icon">Loader2</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
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

// Mock AdminAccessDeniedState component
jest.mock("@/components/admin/AdminAccessDeniedState", () => ({
  AdminAccessDeniedState: ({ onNavigateToLogin }: { onNavigateToLogin: () => void }) => (
    <div data-testid="admin-access-denied">
      <p>Access Denied - Admin already exists</p>
      <button onClick={onNavigateToLogin}>Go to Login</button>
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

describe("CreateAdminPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading state while checking admin status", () => {
      // Keep the promise pending
      mockCheckAdminExists.mockReturnValue(new Promise(() => {}));

      render(<CreateAdminPage />);

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
      expect(screen.getByText("Checking system status...")).toBeInTheDocument();
    });
  });

  describe("admin exists state", () => {
    it("shows access denied when admin already exists", async () => {
      mockCheckAdminExists.mockResolvedValue({ exists: true });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-access-denied")).toBeInTheDocument();
      });

      expect(screen.getByText("Access Denied - Admin already exists")).toBeInTheDocument();
    });

    it("navigates to login when clicking go to login", async () => {
      mockCheckAdminExists.mockResolvedValue({ exists: true });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-access-denied")).toBeInTheDocument();
      });

      const loginButton = screen.getByText("Go to Login");
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).not.toBeDisabled();
      // The button triggers onNavigateToLogin which sets location.href
      fireEvent.click(loginButton);
    });
  });

  describe("no admin exists state", () => {
    beforeEach(() => {
      mockCheckAdminExists.mockResolvedValue({ exists: false });
    });

    it("renders the create admin form when no admin exists", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        // Check for the title in the AuthCard
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      expect(screen.getByText("Create a new admin user account for system access")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("atal.app.ai@gmail.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter secure password")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    });

    it("renders back to login button", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("← Back to Login")).toBeInTheDocument();
      });
    });

    it("renders create admin button", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        // Get the button specifically (not the heading)
        const buttons = screen.getAllByText("Create Admin Account");
        const createButton = buttons.find(el => el.tagName === "BUTTON");
        expect(createButton).toBeInTheDocument();
      });
    });
  });

  describe("form validation", () => {
    beforeEach(() => {
      mockCheckAdminExists.mockResolvedValue({ exists: false });
    });

    const getCreateButton = () => {
      const buttons = screen.getAllByText("Create Admin Account");
      return buttons.find(el => el.tagName === "BUTTON") as HTMLButtonElement;
    };

    it("disables button when email is empty", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      // Fill password fields but leave email empty
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(passwordInput, "password123");
      await userEvent.type(confirmPasswordInput, "password123");

      // Button should be disabled when email is empty
      expect(getCreateButton()).toBeDisabled();
      expect(mockCreateAdminUser).not.toHaveBeenCalled();
    });

    it("disables button when password is empty", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      await userEvent.type(emailInput, "test@example.com");

      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");
      await userEvent.type(confirmPasswordInput, "password123");

      // Button should be disabled when password is empty
      expect(getCreateButton()).toBeDisabled();
      expect(mockCreateAdminUser).not.toHaveBeenCalled();
    });

    it("shows error when password is less than 8 characters", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "test@example.com");
      await userEvent.type(passwordInput, "short");
      await userEvent.type(confirmPasswordInput, "short");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      });

      expect(mockCreateAdminUser).not.toHaveBeenCalled();
    });

    it("shows error when passwords do not match", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "test@example.com");
      await userEvent.type(passwordInput, "password123");
      await userEvent.type(confirmPasswordInput, "differentpass");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
      });

      expect(mockCreateAdminUser).not.toHaveBeenCalled();
    });
  });

  describe("successful admin creation", () => {
    beforeEach(() => {
      mockCheckAdminExists.mockResolvedValue({ exists: false });
    });

    const getCreateButton = () => {
      const buttons = screen.getAllByText("Create Admin Account");
      return buttons.find(el => el.tagName === "BUTTON") as HTMLButtonElement;
    };

    it("calls createAdminUser and shows success message", async () => {
      mockCreateAdminUser.mockResolvedValue({ success: true });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "admin@example.com");
      await userEvent.type(passwordInput, "securepassword123");
      await userEvent.type(confirmPasswordInput, "securepassword123");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(mockCreateAdminUser).toHaveBeenCalledWith("admin@example.com", "securepassword123");
      });

      await waitFor(() => {
        expect(screen.getByText(/Admin account created/)).toBeInTheDocument();
      });
    });

    it("shows next steps message after delay", async () => {
      jest.useFakeTimers();
      mockCreateAdminUser.mockResolvedValue({ success: true });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      // Use fireEvent instead of userEvent with fake timers
      fireEvent.change(emailInput, { target: { value: "admin@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "securepassword123" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "securepassword123" } });

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(mockCreateAdminUser).toHaveBeenCalled();
      });

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(screen.getByText(/You can now login at/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("converts email to lowercase", async () => {
      mockCreateAdminUser.mockResolvedValue({ success: true });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "ADMIN@EXAMPLE.COM");
      await userEvent.type(passwordInput, "securepassword123");
      await userEvent.type(confirmPasswordInput, "securepassword123");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(mockCreateAdminUser).toHaveBeenCalledWith("admin@example.com", "securepassword123");
      });
    });
  });

  describe("failed admin creation", () => {
    beforeEach(() => {
      mockCheckAdminExists.mockResolvedValue({ exists: false });
    });

    const getCreateButton = () => {
      const buttons = screen.getAllByText("Create Admin Account");
      return buttons.find(el => el.tagName === "BUTTON") as HTMLButtonElement;
    };

    it("shows error message when createAdminUser fails", async () => {
      mockCreateAdminUser.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "admin@example.com");
      await userEvent.type(passwordInput, "securepassword123");
      await userEvent.type(confirmPasswordInput, "securepassword123");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(screen.getByText("Email already registered")).toBeInTheDocument();
      });
    });

    it("shows default error message when no error provided", async () => {
      mockCreateAdminUser.mockResolvedValue({ success: false });

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "admin@example.com");
      await userEvent.type(passwordInput, "securepassword123");
      await userEvent.type(confirmPasswordInput, "securepassword123");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(screen.getByText("Failed to create admin account")).toBeInTheDocument();
      });
    });

    it("handles exception during createAdminUser", async () => {
      mockCreateAdminUser.mockRejectedValue(new Error("Network error"));

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "admin@example.com");
      await userEvent.type(passwordInput, "securepassword123");
      await userEvent.type(confirmPasswordInput, "securepassword123");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("handles non-Error exception during createAdminUser", async () => {
      mockCreateAdminUser.mockRejectedValue("String error");

      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("atal.app.ai@gmail.com");
      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");

      await userEvent.type(emailInput, "admin@example.com");
      await userEvent.type(passwordInput, "securepassword123");
      await userEvent.type(confirmPasswordInput, "securepassword123");

      fireEvent.click(getCreateButton());

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("password visibility toggle", () => {
    beforeEach(() => {
      mockCheckAdminExists.mockResolvedValue({ exists: false });
    });

    it("toggles password visibility when clicking the eye icon", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create Admin Account" })).toBeInTheDocument();
      });

      const passwordInput = screen.getByPlaceholderText("Enter secure password");
      expect(passwordInput).toHaveAttribute("type", "password");

      // Find and click the toggle button (it's a button element inside the password field)
      const eyeIcon = screen.getByTestId("eye-icon");
      const toggleButton = eyeIcon.closest("button");
      if (toggleButton) {
        fireEvent.click(toggleButton);
      }

      // After click, password should be visible
      expect(passwordInput).toHaveAttribute("type", "text");

      // Click again to hide
      const eyeOffIcon = screen.getByTestId("eye-off-icon");
      const toggleButton2 = eyeOffIcon.closest("button");
      if (toggleButton2) {
        fireEvent.click(toggleButton2);
      }

      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("back to login button", () => {
    beforeEach(() => {
      mockCheckAdminExists.mockResolvedValue({ exists: false });
    });

    it("renders and is clickable", async () => {
      render(<CreateAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("← Back to Login")).toBeInTheDocument();
      });

      const backButton = screen.getByText("← Back to Login");
      expect(backButton).not.toBeDisabled();
      // The button sets location.href, which we can't easily test in jsdom
      fireEvent.click(backButton);
    });
  });
});
