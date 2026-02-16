/**
 * Tests for useRequireAuth hook
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Mock dependencies
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockGetUser = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

describe("useRequireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("should set user and stop loading when authenticated", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01",
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should redirect to default path when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/student/start");
    });
  });

  it("should redirect to custom path when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderHook(() => useRequireAuth("/custom/login"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/custom/login");
    });
  });

  it("should redirect when auth error occurs", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth error"),
    });

    renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/student/start");
    });
  });

  it("should keep loading true when redirecting", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });

    // Loading remains true when user is redirected
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("should check auth on mount", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01",
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });
  });
});
