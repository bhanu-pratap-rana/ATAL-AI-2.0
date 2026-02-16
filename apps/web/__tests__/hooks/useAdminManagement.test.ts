/**
 * Tests for useAdminManagement hook
 * Target: ~25 tests covering admin account management state and handlers
 */

import { renderHook, act, waitFor } from "@testing-library/react";

// Mock dependencies
jest.mock("@/app/actions/admin-delete", () => ({
  deleteUserByEmail: jest.fn(),
}));

jest.mock("@/app/actions/admin-auth", () => ({
  createAdminUser: jest.fn(),
}));

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/constants/ui-timings", () => ({
  FORM_TIMING: {
    nextStepsDelay: 100,
  },
}));

import { useAdminManagement } from "@/hooks/useAdminManagement";
import { deleteUserByEmail } from "@/app/actions/admin-delete";
import { createAdminUser } from "@/app/actions/admin-auth";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";

describe("useAdminManagement", () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    // Default: authorized super_admin
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          app_metadata: { role: "super_admin" },
        },
      },
    });
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
  });

  describe("Initial State", () => {
    it("should start with checking auth status", () => {
      const { result } = renderHook(() => useAdminManagement());

      expect(result.current.authStatus).toBe("checking");
    });

    it("should initialize with delete step", () => {
      const { result } = renderHook(() => useAdminManagement());

      expect(result.current.step).toBe("delete");
    });

    it("should initialize with default email", () => {
      const { result } = renderHook(() => useAdminManagement());

      expect(result.current.email).toBe("atal.app.ai@gmail.com");
    });

    it("should initialize with empty passwords", () => {
      const { result } = renderHook(() => useAdminManagement());

      expect(result.current.password).toBe("");
      expect(result.current.confirmPassword).toBe("");
    });

    it("should initialize with hidden password", () => {
      const { result } = renderHook(() => useAdminManagement());

      expect(result.current.showPassword).toBe(false);
    });

    it("should initialize not completed", () => {
      const { result } = renderHook(() => useAdminManagement());

      expect(result.current.completed).toBe(false);
    });
  });

  describe("Auth Check", () => {
    it("should set authorized for super_admin", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });
    });

    it("should set unauthorized for regular user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "student" },
          },
        },
      });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("unauthorized");
      });
    });

    it("should set unauthorized when no user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("unauthorized");
      });
    });

    it("should set unauthorized on auth error", async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error("Auth failed"));

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("unauthorized");
      });
    });
  });

  describe("State Setters", () => {
    it("should update email", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setEmail("new@email.com");
      });

      expect(result.current.email).toBe("new@email.com");
    });

    it("should update password", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("newpassword");
      });

      expect(result.current.password).toBe("newpassword");
    });

    it("should update confirm password", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setConfirmPassword("newpassword");
      });

      expect(result.current.confirmPassword).toBe("newpassword");
    });

    it("should toggle show password", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setShowPassword(true);
      });

      expect(result.current.showPassword).toBe(true);
    });

    it("should change step", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setStep("create");
      });

      expect(result.current.step).toBe("create");
    });
  });

  describe("handleDeleteUser", () => {
    it("should show error for empty email", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setEmail("");
      });

      await act(async () => {
        await result.current.handleDeleteUser();
      });

      expect(result.current.message?.type).toBe("error");
      expect(result.current.message?.text).toContain("email");
    });

    it("should not delete if user cancels confirmation", async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      await act(async () => {
        await result.current.handleDeleteUser();
      });

      expect(deleteUserByEmail).not.toHaveBeenCalled();
    });

    it("should call deleteUserByEmail on confirmation", async () => {
      (deleteUserByEmail as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      await act(async () => {
        await result.current.handleDeleteUser();
      });

      expect(deleteUserByEmail).toHaveBeenCalledWith("atal.app.ai@gmail.com");
    });

    it("should show success message on deletion", async () => {
      (deleteUserByEmail as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      await act(async () => {
        await result.current.handleDeleteUser();
      });

      expect(result.current.message?.type).toBe("success");
      expect(toast.success).toHaveBeenCalled();
    });

    it("should show error message on deletion failure", async () => {
      (deleteUserByEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: "User not found",
      });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      await act(async () => {
        await result.current.handleDeleteUser();
      });

      expect(result.current.message?.type).toBe("error");
      expect(toast.error).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (deleteUserByEmail as jest.Mock).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      await act(async () => {
        await result.current.handleDeleteUser();
      });

      expect(result.current.message?.type).toBe("error");
      expect(result.current.message?.text).toContain("Network error");
    });
  });

  describe("handleCreateAdmin", () => {
    it("should show error for empty email", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setEmail("");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.message?.type).toBe("error");
      expect(result.current.message?.text).toContain("email");
    });

    it("should show error for empty password", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.message?.type).toBe("error");
      expect(result.current.message?.text).toContain("password");
    });

    it("should show error for short password", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("short");
        result.current.setConfirmPassword("short");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.message?.type).toBe("error");
      expect(result.current.message?.text).toContain("8 characters");
    });

    it("should show error for mismatched passwords", async () => {
      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("password123");
        result.current.setConfirmPassword("different123");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.message?.type).toBe("error");
      expect(result.current.message?.text).toContain("do not match");
    });

    it("should call createAdminUser with valid data", async () => {
      (createAdminUser as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("validpassword123");
        result.current.setConfirmPassword("validpassword123");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(createAdminUser).toHaveBeenCalledWith(
        "atal.app.ai@gmail.com",
        "validpassword123"
      );
    });

    it("should show success and set completed on creation", async () => {
      (createAdminUser as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("validpassword123");
        result.current.setConfirmPassword("validpassword123");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.message?.type).toBe("success");
      expect(result.current.completed).toBe(true);
      expect(toast.success).toHaveBeenCalled();
    });

    it("should clear passwords on successful creation", async () => {
      (createAdminUser as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("validpassword123");
        result.current.setConfirmPassword("validpassword123");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.password).toBe("");
      expect(result.current.confirmPassword).toBe("");
    });

    it("should show error on creation failure", async () => {
      (createAdminUser as jest.Mock).mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("validpassword123");
        result.current.setConfirmPassword("validpassword123");
      });

      await act(async () => {
        await result.current.handleCreateAdmin();
      });

      expect(result.current.message?.type).toBe("error");
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should set loading during delete operation", async () => {
      let resolveDelete: (value: { success: boolean }) => void;
      (deleteUserByEmail as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveDelete = resolve;
        })
      );

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.handleDeleteUser();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveDelete!({ success: true });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should set loading during create operation", async () => {
      let resolveCreate: (value: { success: boolean }) => void;
      (createAdminUser as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
      );

      const { result } = renderHook(() => useAdminManagement());

      await waitFor(() => {
        expect(result.current.authStatus).toBe("authorized");
      });

      act(() => {
        result.current.setPassword("validpassword123");
        result.current.setConfirmPassword("validpassword123");
      });

      act(() => {
        result.current.handleCreateAdmin();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveCreate!({ success: true });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
