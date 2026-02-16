/**
 * Tests for Admin Login Page
 * Tests authentication flow for admin users
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
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Supabase mock
const mockGetSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  }),
}));

import AdminLoginPage from "@/app/(public)/admin/login/page";
import { toast } from "sonner";

describe("AdminLoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({ error: null });
  });

  describe("Rendering", () => {
    it("should render the login form", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Login")).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Login as Admin/i })
      ).toBeInTheDocument();
    });

    it("should render the back button", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
      });
    });

    it("should render security notice", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/Security Notice/i)).toBeInTheDocument();
      });
    });

    it("should render default admin info", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/Default Admin/i)).toBeInTheDocument();
        expect(screen.getByText("atal.app.ai@gmail.com")).toBeInTheDocument();
      });
    });
  });

  describe("Session Check", () => {
    it("should redirect super_admin to dashboard", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              app_metadata: { role: "super_admin" },
            },
          },
        },
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
      });
    });

    it("should redirect admin to pins page", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              app_metadata: { role: "admin" },
            },
          },
        },
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/pins");
      });
    });

    it("should show sign out option for non-admin session", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              app_metadata: { role: "teacher" },
            },
          },
        },
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Already logged in as teacher\/student/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is empty", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("should show error when password is empty", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/Admin Email/i);
      fireEvent.change(emailInput, { target: { value: "admin@example.com" } });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Password is required")).toBeInTheDocument();
      });
    });
  });

  describe("Login Flow", () => {
    it("should show error for invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid credentials" },
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Admin Email/i), {
        target: { value: "wrong@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: "wrongpassword" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
      });
    });

    it("should show error for non-admin user", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: {
            email: "teacher@example.com",
            app_metadata: { role: "teacher" },
          },
        },
        error: null,
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Admin Email/i), {
        target: { value: "teacher@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(
          screen.getByText("This account does not have admin access")
        ).toBeInTheDocument();
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it("should redirect super_admin to dashboard on successful login", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: {
            email: "admin@example.com",
            app_metadata: { role: "super_admin" },
          },
        },
        error: null,
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Admin Email/i), {
        target: { value: "admin@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Admin login successful!");
        expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
      });
    });

    it("should redirect regular admin to pins page on successful login", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: {
            email: "admin@example.com",
            app_metadata: { role: "admin" },
          },
        },
        error: null,
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Admin Email/i), {
        target: { value: "admin@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Admin login successful!");
        expect(mockPush).toHaveBeenCalledWith("/admin/pins");
      });
    });
  });

  describe("Sign Out", () => {
    it("should handle sign out for non-admin session", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              app_metadata: { role: "student" },
            },
          },
        },
      });

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Sign Out Current Session/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /Sign Out Current Session/i })
      );

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Signed out successfully");
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to home when back button is clicked", async () => {
      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Back/i }));

      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors", async () => {
      mockSignInWithPassword.mockRejectedValue(new Error("Network error"));

      render(<AdminLoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Admin Email/i), {
        target: { value: "admin@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: "password123" },
      });

      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });
});
