/**
 * Tests for client-logger.ts
 * Target: ~18 tests covering client-side logging with masking
 */

// Mock dependencies before imports
jest.mock("@/lib/masking-utils", () => ({
  maskSensitiveData: jest.fn((data) => {
    const masked = { ...data };
    if (masked.email) masked.email = "***@***.***";
    if (masked.password) masked.password = "********";
    return masked;
  }),
}));

jest.mock("@/lib/form-utils", () => ({
  getMaskedContext: jest.fn((context, maskFn) => {
    if (context instanceof Error) return context;
    return context ? maskFn(context) : undefined;
  }),
}));

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

describe("client-logger", () => {
  let clientLogger: typeof import("@/lib/client-logger").clientLogger;
  let mockSentry: { captureMessage: jest.Mock; captureException: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock console
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();

    // Setup Sentry mock
    mockSentry = {
      captureMessage: jest.fn(),
      captureException: jest.fn(),
    };

    (globalThis as Record<string, unknown>).Sentry = mockSentry;
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;

    delete (globalThis as Record<string, unknown>).Sentry;
  });

  describe("Development Environment", () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = "development";
      clientLogger = require("@/lib/client-logger").clientLogger;
    });

    it("should log debug messages in development", () => {
      clientLogger.debug("Debug message", { key: "value" });

      expect(console.log).toHaveBeenCalledWith(
        "[DEBUG] Debug message",
        expect.any(Object)
      );
    });

    it("should log info messages in development", () => {
      clientLogger.info("Info message", { data: "test" });

      expect(console.info).toHaveBeenCalledWith(
        "[INFO] Info message",
        expect.any(Object)
      );
    });

    it("should log warning messages", () => {
      clientLogger.warn("Warning message", { userId: "123" });

      expect(console.warn).toHaveBeenCalledWith(
        "[WARN] Warning message",
        expect.any(Object)
      );
    });

    it("should log error messages", () => {
      clientLogger.error("Error message", { context: "test" });

      expect(console.error).toHaveBeenCalledWith(
        "[ERROR] Error message",
        expect.any(Object)
      );
    });

    it("should log error with Error object", () => {
      const error = new Error("Test error");
      clientLogger.error("Error occurred", error);

      expect(console.error).toHaveBeenCalledWith(
        "[ERROR] Error occurred",
        error
      );
    });

    it("should log success messages in development", () => {
      clientLogger.success("Success message", { result: "ok" });

      expect(console.log).toHaveBeenCalledWith(
        "[SUCCESS] Success message",
        expect.any(Object)
      );
    });

    it("should log critical messages", () => {
      const error = new Error("Critical error");
      clientLogger.critical("Critical message", error);

      expect(console.error).toHaveBeenCalledWith(
        "[CRITICAL] Critical message",
        error
      );
    });

    it("should mask sensitive data in context", () => {
      const { maskSensitiveData } = require("@/lib/masking-utils");

      clientLogger.info("User action", {
        email: "user@example.com",
        password: "secret123",
      });

      expect(maskSensitiveData).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
    });

    it("should handle undefined context", () => {
      clientLogger.debug("Message without context");

      expect(console.log).toHaveBeenCalledWith(
        "[DEBUG] Message without context",
        undefined
      );
    });
  });

  describe("Production Environment", () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = "production";
      clientLogger = require("@/lib/client-logger").clientLogger;
    });

    afterEach(() => {
      process.env.NODE_ENV = "test";
    });

    it("should NOT log debug messages in production", () => {
      clientLogger.debug("Debug message");

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should NOT log info messages in production", () => {
      clientLogger.info("Info message");

      expect(console.info).not.toHaveBeenCalled();
    });

    it("should NOT log success messages in production", () => {
      clientLogger.success("Success message");

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should log warnings and send to Sentry in production", () => {
      clientLogger.warn("Warning message", { context: "test" });

      expect(console.warn).toHaveBeenCalledWith(
        "[WARN] Warning message",
        expect.any(Object)
      );
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "Warning message",
        "warning"
      );
    });

    it("should log errors and send to Sentry in production", () => {
      const error = new Error("Test error");
      clientLogger.error("Error message", error);

      expect(console.error).toHaveBeenCalledWith(
        "[ERROR] Error message",
        error
      );
      expect(mockSentry.captureException).toHaveBeenCalledWith(error);
    });

    it("should log critical errors and send to Sentry with fatal level", () => {
      const error = new Error("Critical error");
      clientLogger.critical("Critical message", error);

      expect(console.error).toHaveBeenCalledWith(
        "[CRITICAL] Critical message",
        error
      );
      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        level: "fatal",
      });
    });
  });

  describe("Sentry Integration", () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = "production";
      clientLogger = require("@/lib/client-logger").clientLogger;
    });

    afterEach(() => {
      process.env.NODE_ENV = "test";
    });

    it("should handle missing Sentry gracefully", () => {
      delete (globalThis as Record<string, unknown>).Sentry;

      // Should not throw
      clientLogger.warn("Warning without Sentry");
      clientLogger.error("Error without Sentry");
      clientLogger.critical("Critical without Sentry");

      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("should create Error object for error log when context is not Error", () => {
      clientLogger.error("Error message", { context: "not an error" });

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    it("should create Error object for critical log when context is not Error", () => {
      clientLogger.critical("Critical message", { context: "not an error" });

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        { level: "fatal" }
      );
    });
  });
});
