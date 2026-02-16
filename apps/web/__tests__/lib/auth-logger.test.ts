/**
 * Tests for auth-logger.ts
 * Target: ~15 tests covering logging with sensitive data masking
 */

// Mock masking utils before imports
jest.mock("@/lib/masking-utils", () => ({
  maskSensitiveData: jest.fn((data) => {
    // Simple mock that returns masked version
    const masked = { ...data };
    if (masked.email) masked.email = "***@***.***";
    if (masked.phone) masked.phone = "***-***-****";
    if (masked.password) masked.password = "********";
    return masked;
  }),
}));

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

describe("auth-logger", () => {
  let authLogger: typeof import("@/lib/auth-logger").authLogger;
  let mockSentry: { captureMessage: jest.Mock; captureException: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock console
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Setup Sentry mock
    mockSentry = {
      captureMessage: jest.fn(),
      captureException: jest.fn(),
    };

    // Mock globalThis for Sentry
    (globalThis as Record<string, unknown>).Sentry = mockSentry;
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Clean up Sentry mock
    delete (globalThis as Record<string, unknown>).Sentry;
  });

  describe("Development Environment", () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = "development";
      // Re-import after setting NODE_ENV
      authLogger = require("@/lib/auth-logger").authLogger;
    });

    it("should log debug messages in development", () => {
      authLogger.debug("Debug message", { key: "value" });

      expect(console.log).toHaveBeenCalledWith(
        "[AUTH:DEBUG] Debug message",
        expect.any(Object)
      );
    });

    it("should log info messages in development", () => {
      authLogger.info("Info message", { data: "test" });

      expect(console.info).toHaveBeenCalledWith(
        "[AUTH:INFO] Info message",
        expect.any(Object)
      );
    });

    it("should log warning messages with context", () => {
      authLogger.warn("Warning message", { userId: "123" });

      expect(console.warn).toHaveBeenCalledWith(
        "[AUTH:WARN] Warning message",
        expect.any(Object)
      );
    });

    it("should log warning messages with Error object", () => {
      const error = new Error("Test error");
      authLogger.warn("Warning with error", error);

      expect(console.warn).toHaveBeenCalledWith(
        "[AUTH:WARN] Warning with error",
        error
      );
    });

    it("should log error messages in development", () => {
      const error = new Error("Test error");
      authLogger.error("Error message", error, { context: "test" });

      expect(console.error).toHaveBeenCalledWith(
        "[AUTH:ERROR] Error message",
        error,
        expect.any(Object)
      );
    });

    it("should log success messages in development", () => {
      authLogger.success("Success message", { result: "ok" });

      expect(console.log).toHaveBeenCalledWith(
        "[AUTH:SUCCESS] ✓ Success message",
        expect.any(Object)
      );
    });

    it("should log critical messages", () => {
      const error = new Error("Critical error");
      authLogger.critical("Critical message", error);

      expect(console.error).toHaveBeenCalledWith(
        "[AUTH:CRITICAL] Critical message",
        error
      );
    });

    it("should mask sensitive data in context", () => {
      const { maskSensitiveData } = require("@/lib/masking-utils");

      authLogger.info("User login", {
        email: "user@example.com",
        password: "secret123",
      });

      expect(maskSensitiveData).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
    });
  });

  describe("Production Environment", () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = "production";
      // Re-import after setting NODE_ENV
      authLogger = require("@/lib/auth-logger").authLogger;
    });

    afterEach(() => {
      process.env.NODE_ENV = "test";
    });

    it("should NOT log debug messages in production", () => {
      authLogger.debug("Debug message");

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should send info to Sentry in production", () => {
      authLogger.info("Info message");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "Info message",
        "info"
      );
    });

    it("should send warning to Sentry in production", () => {
      authLogger.warn("Warning message", { context: "test" });

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "Warning message",
        "warning"
      );
    });

    it("should send error to Sentry in production", () => {
      const error = new Error("Test error");
      authLogger.error("Error message", error);

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        tags: { source: "auth" },
      });
    });

    it("should NOT log success messages in production", () => {
      authLogger.success("Success message");

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should always log critical messages even in production", () => {
      const error = new Error("Critical");
      authLogger.critical("Critical message", error);

      expect(console.error).toHaveBeenCalledWith(
        "[AUTH:CRITICAL] Critical message",
        error
      );
      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        level: "fatal",
        tags: { source: "auth" },
      });
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = "development";
      authLogger = require("@/lib/auth-logger").authLogger;
    });

    it("should handle undefined context", () => {
      authLogger.info("Message without context");

      expect(console.info).toHaveBeenCalledWith(
        "[AUTH:INFO] Message without context",
        undefined
      );
    });

    it("should handle null error in error log", () => {
      authLogger.error("Error without error object", undefined, { key: "value" });

      expect(console.error).toHaveBeenCalledWith(
        "[AUTH:ERROR] Error without error object",
        undefined,
        expect.any(Object)
      );
    });

    it("should handle non-Error objects in error log", () => {
      authLogger.error("String error", "Not an error object");

      expect(console.error).toHaveBeenCalled();
    });

    it("should handle warn without any second argument", () => {
      authLogger.warn("Warning only");

      expect(console.warn).toHaveBeenCalledWith(
        "[AUTH:WARN] Warning only",
        undefined
      );
    });
  });
});
