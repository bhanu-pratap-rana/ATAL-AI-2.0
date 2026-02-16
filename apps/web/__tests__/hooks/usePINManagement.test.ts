/**
 * Tests for usePINManagement hook
 * Target: ~25 tests covering state management, authentication, PIN operations
 */

import { renderHook, act, waitFor } from "@testing-library/react";

// Mock dependencies before imports
const mockPush = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({});
const mockGetUser = jest.fn();
const mockWriteText = jest.fn().mockResolvedValue(undefined);

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/app/actions/admin-pin-management", () => ({
  getSchoolPINInfo: jest.fn(),
  rotateSchoolPIN: jest.fn(),
  getAllSchoolsWithPINs: jest.fn(),
  getPINStatistics: jest.fn(),
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
  CLIPBOARD_TIMING: {
    successFeedback: 2000,
  },
}));

jest.mock("@/lib/constants/validation-limits", () => ({
  PIN_LIMITS: {
    min: 1000,
    max: 9999,
  },
}));

// Mock crypto.getRandomValues
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: (arr: Uint32Array) => {
      arr[0] = 5000; // Will result in PIN 6000 with our mock limits
      return arr;
    },
  },
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

import { usePINManagement } from "@/hooks/usePINManagement";
import {
  getSchoolPINInfo,
  rotateSchoolPIN,
  getAllSchoolsWithPINs,
  getPINStatistics,
} from "@/app/actions/admin-pin-management";
import { toast } from "sonner";

describe("usePINManagement", () => {
  const mockSchools = [
    {
      schoolId: "school-1",
      schoolName: "Test School A",
      schoolCode: "TSA001",
      districtName: "District A",
    },
    {
      schoolId: "school-2",
      schoolName: "Test School B",
      schoolCode: "TSB002",
      districtName: "District B",
    },
  ];

  const mockStats = {
    totalSchools: 10,
    schoolsWithPINs: 8,
    schoolsWithoutPINs: 2,
  };

  const mockSchoolInfo = {
    schoolId: "school-1",
    schoolName: "Test School A",
    schoolCode: "TSA001",
    currentPIN: "1234",
    createdAt: "2024-01-01",
    rotatedAt: "2024-01-15",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          email: "admin@test.com",
          app_metadata: { role: "admin" },
        },
      },
    });

    (getAllSchoolsWithPINs as jest.Mock).mockResolvedValue({
      success: true,
      data: mockSchools,
    });

    (getPINStatistics as jest.Mock).mockResolvedValue({
      success: true,
      data: mockStats,
    });

    (getSchoolPINInfo as jest.Mock).mockResolvedValue({
      success: true,
      data: mockSchoolInfo,
    });

    (rotateSchoolPIN as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initial State", () => {
    it("should start with loading state true", async () => {
      const { result } = renderHook(() => usePINManagement());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should have empty search query initially", async () => {
      const { result } = renderHook(() => usePINManagement());

      expect(result.current.searchQuery).toBe("");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should have null selected school initially", async () => {
      const { result } = renderHook(() => usePINManagement());

      expect(result.current.selectedSchool).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should have showNewPin as false initially", async () => {
      const { result } = renderHook(() => usePINManagement());

      expect(result.current.showNewPin).toBe(false);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Authentication", () => {
    it("should redirect to login if no user email", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/login");
      });
    });

    it("should set isSuperAdmin true for super_admin role", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            email: "superadmin@test.com",
            app_metadata: { role: "super_admin" },
          },
        },
      });

      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isSuperAdmin).toBe(true);
      });
    });

    it("should set isSuperAdmin false for regular admin", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isSuperAdmin).toBe(false);
      });
    });

    it("should redirect on auth error", async () => {
      mockGetUser.mockRejectedValue(new Error("Auth failed"));

      renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/login");
      });
    });
  });

  describe("Data Loading", () => {
    it("should load schools on mount", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.allSchools).toEqual(mockSchools);
      });
    });

    it("should load statistics on mount", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });

    it("should set filteredSchools to allSchools initially", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.filteredSchools).toEqual(mockSchools);
      });
    });
  });

  describe("Search Filtering", () => {
    it("should filter schools by name", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.allSchools.length).toBe(2);
      });

      act(() => {
        result.current.setSearchQuery("School A");
      });

      await waitFor(() => {
        expect(result.current.filteredSchools.length).toBe(1);
        expect(result.current.filteredSchools[0].schoolName).toBe("Test School A");
      });
    });

    it("should filter schools by code", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.allSchools.length).toBe(2);
      });

      act(() => {
        result.current.setSearchQuery("TSB002");
      });

      await waitFor(() => {
        expect(result.current.filteredSchools.length).toBe(1);
        expect(result.current.filteredSchools[0].schoolCode).toBe("TSB002");
      });
    });

    it("should show all schools when search is cleared", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.allSchools.length).toBe(2);
      });

      act(() => {
        result.current.setSearchQuery("School A");
      });

      await waitFor(() => {
        expect(result.current.filteredSchools.length).toBe(1);
      });

      act(() => {
        result.current.setSearchQuery("");
      });

      await waitFor(() => {
        expect(result.current.filteredSchools.length).toBe(2);
      });
    });

    it("should show suggestions when search has results", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.allSchools.length).toBe(2);
      });

      act(() => {
        result.current.setSearchQuery("School");
      });

      await waitFor(() => {
        expect(result.current.showSuggestions).toBe(true);
      });
    });

    it("should hide suggestions when search is empty", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.allSchools.length).toBe(2);
      });

      act(() => {
        result.current.setSearchQuery("");
      });

      await waitFor(() => {
        expect(result.current.showSuggestions).toBe(false);
      });
    });
  });

  describe("School Selection", () => {
    it("should load school details when selected", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      expect(getSchoolPINInfo).toHaveBeenCalledWith("school-1");
      expect(result.current.selectedSchool).toEqual(mockSchoolInfo);
    });

    it("should update search query with school name", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      expect(result.current.searchQuery).toBe("Test School A");
    });

    it("should show error toast when school details fail to load", async () => {
      (getSchoolPINInfo as jest.Mock).mockResolvedValue({
        success: false,
        error: "Failed to load",
      });

      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to load school details");
    });
  });

  describe("PIN Generation", () => {
    it("should generate a random PIN", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleGenerateRandomPin();
      });

      // With our mock crypto, PIN should be 1000 + (5000 % 9000) = 6000
      expect(result.current.newPin).toBe("6000");
    });
  });

  describe("PIN Rotation", () => {
    it("should not rotate if no school selected", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleRotatePin("1234");
      });

      expect(rotateSchoolPIN).not.toHaveBeenCalled();
    });

    it("should show error if no PIN to rotate", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      await act(async () => {
        await result.current.handleRotatePin();
      });

      expect(toast.error).toHaveBeenCalledWith("No PIN to rotate");
    });

    it("should rotate PIN with custom value", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      await act(async () => {
        await result.current.handleRotatePin("5678");
      });

      expect(rotateSchoolPIN).toHaveBeenCalledWith("school-1", "5678");
    });

    it("should show success toast on successful rotation", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      await act(async () => {
        await result.current.handleRotatePin("5678");
      });

      expect(toast.success).toHaveBeenCalledWith("PIN rotated successfully");
    });

    it("should show error toast on failed rotation", async () => {
      (rotateSchoolPIN as jest.Mock).mockResolvedValue({
        success: false,
        error: "Rotation failed",
      });

      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSelectSchool(mockSchools[0]);
      });

      await act(async () => {
        await result.current.handleRotatePin("5678");
      });

      expect(toast.error).toHaveBeenCalledWith("Rotation failed");
    });
  });

  describe("Clipboard", () => {
    it("should copy PIN to clipboard", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleGenerateRandomPin();
      });

      await act(async () => {
        await result.current.copyPinToClipboard();
      });

      expect(mockWriteText).toHaveBeenCalledWith("6000");
      expect(result.current.copied).toBe(true);
    });

    it("should not copy if no PIN exists", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.copyPinToClipboard();
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("should navigate to dashboard", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.navigateToDashboard();
      });

      expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  describe("Sign Out", () => {
    it("should sign out and redirect to login", async () => {
      const { result } = renderHook(() => usePINManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSignOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });
});
