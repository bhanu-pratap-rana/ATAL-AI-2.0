/**
 * Tests for AdminListTable component
 * Target: ~25 tests covering table rendering, delete, and password reset
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminListTable } from "@/components/admin/AdminListTable";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Trash2: ({ className }: { className?: string }) => (
    <span data-testid="trash-icon" className={className}>
      Trash
    </span>
  ),
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="rotate-icon" className={className}>
      Rotate
    </span>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <span data-testid="alert-icon" className={className}>
      Alert
    </span>
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="x-icon" className={className}>
      X
    </span>
  ),
  Eye: ({ className }: { className?: string }) => (
    <span data-testid="eye-icon" className={className}>
      Eye
    </span>
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <span data-testid="eye-off-icon" className={className}>
      EyeOff
    </span>
  ),
}));

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock admin-management actions
const mockListAdminAccounts = jest.fn();
const mockDeleteAdminAccount = jest.fn();
const mockResetAdminPassword = jest.fn();

jest.mock("@/app/actions/admin-management", () => ({
  listAdminAccounts: (...args: unknown[]) => mockListAdminAccounts(...args),
  deleteAdminAccount: (...args: unknown[]) => mockDeleteAdminAccount(...args),
  resetAdminPassword: (...args: unknown[]) => mockResetAdminPassword(...args),
}));

describe("AdminListTable", () => {
  const mockAdmins = [
    {
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      created_at: "2024-01-01T00:00:00Z",
      last_sign_in_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "admin-2",
      email: "super@example.com",
      role: "super_admin",
      created_at: "2024-01-01T00:00:00Z",
      last_sign_in_at: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockListAdminAccounts.mockResolvedValue({
      success: true,
      data: mockAdmins,
    });
    mockDeleteAdminAccount.mockResolvedValue({ success: true });
    mockResetAdminPassword.mockResolvedValue({ success: true });
    // Mock window.confirm
    jest.spyOn(globalThis, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("loading state", () => {
    it("should display loading message initially", () => {
      mockListAdminAccounts.mockImplementation(
        () => new Promise(() => {})
      );
      render(<AdminListTable />);

      expect(screen.getByText("Loading admin accounts...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should display error message when loading fails", async () => {
      mockListAdminAccounts.mockResolvedValue({
        success: false,
        error: "Failed to load admins",
      });

      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load admins")).toBeInTheDocument();
      });
    });

    it("should display error icon when error occurs", async () => {
      mockListAdminAccounts.mockResolvedValue({
        success: false,
        error: "Error message",
      });

      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
      });
    });

    it("should handle unexpected errors during loading", async () => {
      mockListAdminAccounts.mockRejectedValue(new Error("Network error"));

      render(<AdminListTable />);

      await waitFor(() => {
        expect(
          screen.getByText("An error occurred while loading admins")
        ).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("should display empty message when no admins", async () => {
      mockListAdminAccounts.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("No admin accounts found")).toBeInTheDocument();
      });
    });
  });

  describe("table rendering", () => {
    it("should render table headers", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("Role")).toBeInTheDocument();
        expect(screen.getByText("Created")).toBeInTheDocument();
        expect(screen.getByText("Last Login")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
    });

    it("should render admin emails", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
        expect(screen.getByText("super@example.com")).toBeInTheDocument();
      });
    });

    it("should display Admin badge for regular admin", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it("should display Super Admin badge for super admin", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });
    });

    it("should display Never for admins without last login", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("Never")).toBeInTheDocument();
      });
    });

    it("should format dates correctly", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        // Dates should be formatted using toLocaleDateString
        expect(screen.getAllByText(/1\/1\/2024|2024/).length).toBeGreaterThan(0);
      });
    });
  });

  describe("action buttons", () => {
    it("should render Reset button for each admin", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: /Reset/i })).toHaveLength(2);
      });
    });

    it("should render Delete button only for regular admins", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        // Only regular admin should have delete button
        expect(screen.getAllByRole("button", { name: /Delete/i })).toHaveLength(1);
      });
    });

    it("should not render Delete button for super admin", async () => {
      const superAdminOnly = [
        {
          id: "admin-1",
          email: "super@example.com",
          role: "super_admin",
          created_at: "2024-01-01T00:00:00Z",
          last_sign_in_at: null,
        },
      ];
      mockListAdminAccounts.mockResolvedValue({
        success: true,
        data: superAdminOnly,
      });

      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Delete/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("delete functionality", () => {
    it("should call confirm before deleting", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

      expect(globalThis.confirm).toHaveBeenCalled();
    });

    it("should not delete when confirm is cancelled", async () => {
      jest.spyOn(globalThis, "confirm").mockReturnValue(false);

      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

      expect(mockDeleteAdminAccount).not.toHaveBeenCalled();
    });

    it("should call deleteAdminAccount when confirmed", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

      await waitFor(() => {
        expect(mockDeleteAdminAccount).toHaveBeenCalledWith("admin-1");
      });
    });

    it("should show success toast on successful delete", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Admin account deleted successfully"
        );
      });
    });

    it("should show error toast on failed delete", async () => {
      mockDeleteAdminAccount.mockResolvedValue({
        success: false,
        error: "Cannot delete admin",
      });

      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Cannot delete admin");
      });
    });

    it("should call onAdminDeleted callback on successful delete", async () => {
      const onAdminDeleted = jest.fn();
      render(<AdminListTable onAdminDeleted={onAdminDeleted} />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

      await waitFor(() => {
        expect(onAdminDeleted).toHaveBeenCalled();
      });
    });
  });

  describe("password reset modal", () => {
    it("should open reset modal when clicking Reset button", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);

      // Modal should have password input
      expect(screen.getByPlaceholderText(/New password/i)).toBeInTheDocument();
    });

    it("should display admin email in modal", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);

      // The email should appear in the modal description
      const adminEmail = screen.getAllByText("admin@example.com");
      expect(adminEmail.length).toBeGreaterThan(0);
    });

    it("should close modal when clicking X button", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);
      expect(screen.getByPlaceholderText(/New password/i)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("x-icon").closest("button")!);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/New password/i)).not.toBeInTheDocument();
      });
    });

    it("should close modal when clicking Cancel button", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/New password/i)).not.toBeInTheDocument();
      });
    });

    it("should show error for empty password", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

      expect(screen.getByText("Please enter a new password")).toBeInTheDocument();
    });

    it("should show error for short password", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);

      const input = screen.getByPlaceholderText(/New password/i);
      fireEvent.change(input, { target: { value: "short" } });

      fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

      expect(
        screen.getByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });

    it("should call resetAdminPassword with valid password", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);

      const input = screen.getByPlaceholderText(/New password/i);
      fireEvent.change(input, { target: { value: "validpassword123" } });

      fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

      await waitFor(() => {
        expect(mockResetAdminPassword).toHaveBeenCalledWith(
          "admin-1",
          "validpassword123"
        );
      });
    });

    it("should show success toast on successful password reset", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);

      const input = screen.getByPlaceholderText(/New password/i);
      fireEvent.change(input, { target: { value: "validpassword123" } });

      fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Password reset successfully"
        );
      });
    });

    it("should toggle password visibility", async () => {
      render(<AdminListTable />);

      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole("button", { name: /Reset/i })[0]);

      const input = screen.getByPlaceholderText(/New password/i);
      expect(input).toHaveAttribute("type", "password");

      // Click eye icon to show password
      const toggleButton = screen.getByTestId("eye-icon").closest("button");
      fireEvent.click(toggleButton!);

      expect(input).toHaveAttribute("type", "text");
    });
  });

  describe("refresh trigger", () => {
    it("should reload admins when refreshTrigger changes", async () => {
      const { rerender } = render(<AdminListTable refreshTrigger={0} />);

      await waitFor(() => {
        expect(mockListAdminAccounts).toHaveBeenCalledTimes(1);
      });

      rerender(<AdminListTable refreshTrigger={1} />);

      await waitFor(() => {
        expect(mockListAdminAccounts).toHaveBeenCalledTimes(2);
      });
    });
  });
});
