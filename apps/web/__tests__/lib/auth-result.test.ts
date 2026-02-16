/**
 * Tests for auth-result type
 * Target: ~10 tests covering AuthResult interface usage
 */

import type { AuthResult } from "@/lib/auth-result";

describe("AuthResult interface", () => {
  describe("authorized case", () => {
    it("should represent an authorized user", () => {
      const result: AuthResult = {
        authorized: true,
        user: { id: "user-123" },
      };

      expect(result.authorized).toBe(true);
      expect(result.user.id).toBe("user-123");
    });

    it("should not require error when authorized", () => {
      const result: AuthResult = {
        authorized: true,
        user: { id: "user-456" },
      };

      expect(result.error).toBeUndefined();
    });

    it("should allow error to be present when authorized", () => {
      const result: AuthResult = {
        authorized: true,
        user: { id: "user-789" },
        error: "Warning: limited access",
      };

      expect(result.authorized).toBe(true);
      expect(result.error).toBe("Warning: limited access");
    });
  });

  describe("unauthorized case", () => {
    it("should represent an unauthorized attempt", () => {
      const result: AuthResult = {
        authorized: false,
        user: { id: "" },
        error: "Authentication required",
      };

      expect(result.authorized).toBe(false);
      expect(result.error).toBe("Authentication required");
    });

    it("should allow descriptive error messages", () => {
      const result: AuthResult = {
        authorized: false,
        user: { id: "" },
        error: "Token expired. Please log in again.",
      };

      expect(result.error).toBe("Token expired. Please log in again.");
    });
  });

  describe("user property", () => {
    it("should always have user with id", () => {
      const authorizedResult: AuthResult = {
        authorized: true,
        user: { id: "auth-user" },
      };

      const unauthorizedResult: AuthResult = {
        authorized: false,
        user: { id: "" },
        error: "Not logged in",
      };

      expect(authorizedResult.user).toBeDefined();
      expect(authorizedResult.user.id).toBe("auth-user");
      expect(unauthorizedResult.user).toBeDefined();
      expect(unauthorizedResult.user.id).toBe("");
    });

    it("should support UUID-style user ids", () => {
      const result: AuthResult = {
        authorized: true,
        user: { id: "550e8400-e29b-41d4-a716-446655440000" },
      };

      expect(result.user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("type safety", () => {
    it("should enforce required properties", () => {
      // This test verifies the shape of the type
      const validResult: AuthResult = {
        authorized: true,
        user: { id: "123" },
      };

      expect(validResult).toHaveProperty("authorized");
      expect(validResult).toHaveProperty("user");
      expect(validResult.user).toHaveProperty("id");
    });

    it("should allow conditional checking of authorized status", () => {
      const result: AuthResult = {
        authorized: true,
        user: { id: "test-user" },
      };

      if (result.authorized) {
        // User is always present when authorized
        expect(result.user.id).toBeTruthy();
      }
    });
  });
});
