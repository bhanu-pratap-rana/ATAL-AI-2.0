/**
 * Tests for action-auth-guard.ts
 * Target: ~20 tests covering auth guard wrapper functionality
 */

// Mock dependencies before imports
jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/action-error-handler", () => ({
  handleAuthError: jest.fn((msg) => ({ success: false, error: msg })),
  handleRateLimitError: jest.fn((action, userId) => ({
    success: false,
    error: `Rate limit exceeded for ${action}`,
  })),
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    dashboardStats: { maxTokens: 100, refillRate: 0.1, refillInterval: 1000 },
  },
}));

import {
  withAuthGuard,
  withAuthGuardCustomRateLimit,
} from "@/lib/action-auth-guard";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { authLogger } from "@/lib/auth-logger";
import {
  handleAuthError,
  handleRateLimitError,
} from "@/lib/action-error-handler";

describe("action-auth-guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("withAuthGuard", () => {
    describe("Authorization Checks", () => {
      it("should execute operation when authorized", async () => {
        const mockOperation = jest.fn().mockResolvedValue({ data: "success" });
        const auth = {
          authorized: true,
          user: { id: "user-123", email: "test@example.com" },
        };

        const result = await withAuthGuard("testAction", auth, mockOperation);

        expect(result).toEqual({ data: "success" });
        expect(mockOperation).toHaveBeenCalled();
      });

      it("should return auth error when not authorized", async () => {
        const mockOperation = jest.fn();
        const auth = {
          authorized: false,
          error: "Not authenticated",
        };

        const result = await withAuthGuard("testAction", auth, mockOperation);

        expect(result).toEqual({ success: false, error: "Not authenticated" });
        expect(handleAuthError).toHaveBeenCalledWith("Not authenticated");
        expect(mockOperation).not.toHaveBeenCalled();
      });

      it("should use default error message when no error provided", async () => {
        const mockOperation = jest.fn();
        const auth = {
          authorized: false,
        };

        await withAuthGuard("testAction", auth, mockOperation);

        expect(handleAuthError).toHaveBeenCalledWith(
          "You are not authorized to perform this action"
        );
      });

      it("should log unauthorized access attempts", async () => {
        const mockOperation = jest.fn();
        const auth = {
          authorized: false,
          user: { id: "user-456" },
        };

        await withAuthGuard("sensitiveAction", auth, mockOperation);

        expect(authLogger.warn).toHaveBeenCalledWith(
          "[sensitiveAction] Unauthorized access attempt",
          { userId: "user-456" }
        );
      });

      it("should log undefined userId for unauthenticated users", async () => {
        const mockOperation = jest.fn();
        const auth = {
          authorized: false,
        };

        await withAuthGuard("testAction", auth, mockOperation);

        expect(authLogger.warn).toHaveBeenCalledWith(
          "[testAction] Unauthorized access attempt",
          { userId: undefined }
        );
      });
    });

    describe("Rate Limiting", () => {
      it("should check rate limit for authorized users", async () => {
        const mockOperation = jest.fn().mockResolvedValue({ data: "ok" });
        const auth = {
          authorized: true,
          user: { id: "user-789" },
        };

        await withAuthGuard("testAction", auth, mockOperation);

        expect(checkRateLimit).toHaveBeenCalledWith(
          "action:user-789",
          expect.any(Object)
        );
      });

      it("should return rate limit error when exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);
        const mockOperation = jest.fn();
        const auth = {
          authorized: true,
          user: { id: "user-123" },
        };

        const result = await withAuthGuard("blockedAction", auth, mockOperation);

        expect(result).toEqual({
          success: false,
          error: "Rate limit exceeded for blockedAction",
        });
        expect(handleRateLimitError).toHaveBeenCalledWith(
          "blockedAction",
          "user-123"
        );
        expect(mockOperation).not.toHaveBeenCalled();
      });

      it("should not check rate limit for unauthorized users", async () => {
        const mockOperation = jest.fn();
        const auth = {
          authorized: false,
        };

        await withAuthGuard("testAction", auth, mockOperation);

        expect(checkRateLimit).not.toHaveBeenCalled();
      });
    });

    describe("Operation Execution", () => {
      it("should return operation result on success", async () => {
        const mockOperation = jest.fn().mockResolvedValue({
          success: true,
          data: { id: 1, name: "Test" },
        });
        const auth = {
          authorized: true,
          user: { id: "user-123" },
        };

        const result = await withAuthGuard("createItem", auth, mockOperation);

        expect(result).toEqual({
          success: true,
          data: { id: 1, name: "Test" },
        });
      });

      it("should log debug message when executing action", async () => {
        const mockOperation = jest.fn().mockResolvedValue({ success: true });
        const auth = {
          authorized: true,
          user: { id: "user-456" },
        };

        await withAuthGuard("debugAction", auth, mockOperation);

        expect(authLogger.debug).toHaveBeenCalledWith(
          "[debugAction] Executing action",
          { userId: "user-456" }
        );
      });

      it("should propagate operation errors", async () => {
        const mockOperation = jest
          .fn()
          .mockRejectedValue(new Error("Operation failed"));
        const auth = {
          authorized: true,
          user: { id: "user-123" },
        };

        await expect(
          withAuthGuard("failingAction", auth, mockOperation)
        ).rejects.toThrow("Operation failed");
      });
    });
  });

  describe("withAuthGuardCustomRateLimit", () => {
    describe("Authorization Checks", () => {
      it("should execute operation when authorized", async () => {
        const mockOperation = jest.fn().mockResolvedValue({ data: "custom" });
        const mockRateLimitCheck = jest.fn().mockResolvedValue(true);
        const auth = {
          authorized: true,
          user: { id: "user-123" },
        };

        const result = await withAuthGuardCustomRateLimit(
          "customAction",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(result).toEqual({ data: "custom" });
        expect(mockOperation).toHaveBeenCalled();
      });

      it("should return auth error when not authorized", async () => {
        const mockOperation = jest.fn();
        const mockRateLimitCheck = jest.fn();
        const auth = {
          authorized: false,
          error: "Access denied",
        };

        const result = await withAuthGuardCustomRateLimit(
          "customAction",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(result).toEqual({ success: false, error: "Access denied" });
        expect(mockRateLimitCheck).not.toHaveBeenCalled();
        expect(mockOperation).not.toHaveBeenCalled();
      });

      it("should use default error message when no error provided", async () => {
        const mockOperation = jest.fn();
        const mockRateLimitCheck = jest.fn();
        const auth = {
          authorized: false,
        };

        await withAuthGuardCustomRateLimit(
          "customAction",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(handleAuthError).toHaveBeenCalledWith(
          "You are not authorized to perform this action"
        );
      });
    });

    describe("Custom Rate Limiting", () => {
      it("should use custom rate limit check function", async () => {
        const mockOperation = jest.fn().mockResolvedValue({ ok: true });
        const mockRateLimitCheck = jest.fn().mockResolvedValue(true);
        const auth = {
          authorized: true,
          user: { id: "custom-user" },
        };

        await withAuthGuardCustomRateLimit(
          "customAction",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(mockRateLimitCheck).toHaveBeenCalledWith("custom-user");
        // Standard rate limiter should NOT be called
        expect(checkRateLimit).not.toHaveBeenCalled();
      });

      it("should return rate limit error when custom check fails", async () => {
        const mockOperation = jest.fn();
        const mockRateLimitCheck = jest.fn().mockResolvedValue(false);
        const auth = {
          authorized: true,
          user: { id: "limited-user" },
        };

        const result = await withAuthGuardCustomRateLimit(
          "limitedAction",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(result).toEqual({
          success: false,
          error: "Rate limit exceeded for limitedAction",
        });
        expect(handleRateLimitError).toHaveBeenCalledWith(
          "limitedAction",
          "limited-user"
        );
        expect(mockOperation).not.toHaveBeenCalled();
      });

      it("should not call custom rate check for unauthorized users", async () => {
        const mockOperation = jest.fn();
        const mockRateLimitCheck = jest.fn();
        const auth = {
          authorized: false,
        };

        await withAuthGuardCustomRateLimit(
          "customAction",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(mockRateLimitCheck).not.toHaveBeenCalled();
      });
    });

    describe("Operation Execution", () => {
      it("should return operation result on success", async () => {
        const mockOperation = jest.fn().mockResolvedValue({
          items: [1, 2, 3],
          total: 3,
        });
        const mockRateLimitCheck = jest.fn().mockResolvedValue(true);
        const auth = {
          authorized: true,
          user: { id: "user-123" },
        };

        const result = await withAuthGuardCustomRateLimit(
          "listItems",
          auth,
          mockRateLimitCheck,
          mockOperation
        );

        expect(result).toEqual({
          items: [1, 2, 3],
          total: 3,
        });
      });

      it("should propagate operation errors", async () => {
        const mockOperation = jest
          .fn()
          .mockRejectedValue(new Error("Custom operation failed"));
        const mockRateLimitCheck = jest.fn().mockResolvedValue(true);
        const auth = {
          authorized: true,
          user: { id: "user-123" },
        };

        await expect(
          withAuthGuardCustomRateLimit(
            "failingCustomAction",
            auth,
            mockRateLimitCheck,
            mockOperation
          )
        ).rejects.toThrow("Custom operation failed");
      });
    });
  });
});
