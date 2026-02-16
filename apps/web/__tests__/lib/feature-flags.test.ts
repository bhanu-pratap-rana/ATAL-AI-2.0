/**
 * Tests for feature-flags.ts
 */

// Create mock functions first
const mockServerSingle = jest.fn();
const mockClientSingle = jest.fn();
const mockServerEq = jest.fn();
const mockClientEq = jest.fn();

// Mock setup with proper chaining
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn((column: string) => {
          // For single flag lookup (.eq("id", value).single())
          if (column === "id") {
            return {
              single: mockServerSingle,
            };
          }
          // For getEnabledFeatures (.eq("enabled", true) returns promise directly)
          return mockServerEq();
        }),
      })),
    })),
  })),
}));

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: mockClientSingle,
        })),
      })),
    })),
  })),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  isFeatureEnabled,
  isFeatureEnabledClient,
  getEnabledFeatures,
} from "@/lib/feature-flags";
import { authLogger } from "@/lib/auth-logger";
import { clientLogger } from "@/lib/client-logger";

describe("feature-flags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockServerSingle.mockReset();
    mockClientSingle.mockReset();
    mockServerEq.mockReset();
    mockClientEq.mockReset();
  });

  describe("isFeatureEnabled (server-side)", () => {
    it("should return false when flag not found", async () => {
      mockServerSingle.mockResolvedValue({ data: null, error: null });

      const result = await isFeatureEnabled("unknown_flag");

      expect(result).toBe(false);
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[FeatureFlags] Flag not found or error:",
        expect.any(Object)
      );
    });

    it("should return false when flag is disabled", async () => {
      mockServerSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: false,
          rollout_percentage: 100,
        },
        error: null,
      });

      const result = await isFeatureEnabled("test_flag");

      expect(result).toBe(false);
    });

    it("should return true when flag is enabled and rollout is 100%", async () => {
      mockServerSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 100,
        },
        error: null,
      });

      const result = await isFeatureEnabled("test_flag");

      expect(result).toBe(true);
    });

    it("should return false when no userId and rollout is not 100%", async () => {
      mockServerSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 50,
        },
        error: null,
      });

      const result = await isFeatureEnabled("test_flag");

      expect(result).toBe(false);
    });

    it("should return true when user is whitelisted", async () => {
      mockServerSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 0,
          whitelist_user_ids: ["user-123", "user-456"],
        },
        error: null,
      });

      const result = await isFeatureEnabled("test_flag", "user-123");

      expect(result).toBe(true);
      expect(authLogger.debug).toHaveBeenCalledWith(
        "[FeatureFlags] User in whitelist:",
        expect.objectContaining({ flagId: "test_flag", userId: "user-123" })
      );
    });

    it("should check rollout percentage for non-whitelisted users", async () => {
      mockServerSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 50,
          whitelist_user_ids: [],
        },
        error: null,
      });

      const result = await isFeatureEnabled("test_flag", "some-user-id");

      expect(typeof result).toBe("boolean");
      expect(authLogger.debug).toHaveBeenCalledWith(
        "[FeatureFlags] Rollout check:",
        expect.objectContaining({
          flagId: "test_flag",
          userId: "some-user-id",
        })
      );
    });

    it("should handle database errors gracefully", async () => {
      mockServerSingle.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      const result = await isFeatureEnabled("test_flag");

      expect(result).toBe(false);
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should handle exceptions gracefully", async () => {
      mockServerSingle.mockRejectedValue(new Error("Network error"));

      const result = await isFeatureEnabled("test_flag");

      expect(result).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[FeatureFlags] Error checking feature flag:",
        expect.objectContaining({ error: "Network error" })
      );
    });
  });

  describe("isFeatureEnabledClient (client-side)", () => {
    it("should return false when flag not found", async () => {
      mockClientSingle.mockResolvedValue({ data: null, error: null });

      const result = await isFeatureEnabledClient("unknown_flag");

      expect(result).toBe(false);
      expect(clientLogger.warn).toHaveBeenCalled();
    });

    it("should return false when flag is disabled", async () => {
      mockClientSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: false,
          rollout_percentage: 100,
        },
        error: null,
      });

      const result = await isFeatureEnabledClient("test_flag");

      expect(result).toBe(false);
    });

    it("should return true when flag is enabled and rollout is 100%", async () => {
      mockClientSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 100,
        },
        error: null,
      });

      const result = await isFeatureEnabledClient("test_flag");

      expect(result).toBe(true);
    });

    it("should return true when user is whitelisted", async () => {
      mockClientSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 0,
          whitelist_user_ids: ["user-123"],
        },
        error: null,
      });

      const result = await isFeatureEnabledClient("test_flag", "user-123");

      expect(result).toBe(true);
      expect(clientLogger.debug).toHaveBeenCalledWith(
        "[FeatureFlags] User in whitelist:",
        expect.any(Object)
      );
    });

    it("should handle exceptions gracefully", async () => {
      mockClientSingle.mockRejectedValue(new Error("Network error"));

      const result = await isFeatureEnabledClient("test_flag");

      expect(result).toBe(false);
      expect(clientLogger.error).toHaveBeenCalledWith(
        "[FeatureFlags] Error checking feature flag:",
        expect.objectContaining({ error: "Network error" })
      );
    });
  });

  describe("getEnabledFeatures", () => {
    it("should return empty array when no flags found", async () => {
      mockServerEq.mockResolvedValue({ data: null, error: null });

      const result = await getEnabledFeatures("user-123");

      expect(result).toEqual([]);
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return flags where user is whitelisted", async () => {
      mockServerEq.mockResolvedValue({
        data: [
          {
            id: "flag1",
            enabled: true,
            rollout_percentage: 0,
            whitelist_user_ids: ["user-123"],
          },
          {
            id: "flag2",
            enabled: true,
            rollout_percentage: 0,
            whitelist_user_ids: ["other-user"],
          },
        ],
        error: null,
      });

      const result = await getEnabledFeatures("user-123");

      expect(result).toContain("flag1");
      expect(result).not.toContain("flag2");
    });

    it("should return flags based on rollout percentage", async () => {
      mockServerEq.mockResolvedValue({
        data: [
          {
            id: "flag1",
            enabled: true,
            rollout_percentage: 100,
            whitelist_user_ids: [],
          },
        ],
        error: null,
      });

      const result = await getEnabledFeatures("user-123");

      expect(result).toContain("flag1");
    });

    it("should handle database errors gracefully", async () => {
      mockServerEq.mockResolvedValue({
        data: [],
        error: { message: "Connection error" },
      });

      const result = await getEnabledFeatures("user-123");

      expect(result).toEqual([]);
    });

    it("should handle exceptions gracefully", async () => {
      mockServerEq.mockRejectedValue(new Error("Network error"));

      const result = await getEnabledFeatures("user-123");

      expect(result).toEqual([]);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[FeatureFlags] Error getting enabled features:",
        expect.objectContaining({ error: "Network error" })
      );
    });
  });

  describe("hashUserId consistency", () => {
    it("should produce consistent hash for same userId", async () => {
      mockServerSingle.mockResolvedValue({
        data: {
          id: "test_flag",
          enabled: true,
          rollout_percentage: 50,
          whitelist_user_ids: [],
        },
        error: null,
      });

      const result1 = await isFeatureEnabled("test_flag", "consistent-user");
      const result2 = await isFeatureEnabled("test_flag", "consistent-user");

      expect(result1).toBe(result2);
    });
  });
});
