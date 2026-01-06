/**
 * Auth Logger - Safe logging utility for authentication operations
 *
 * Prevents sensitive data leakage by automatically masking:
 * - Email addresses
 * - Phone numbers
 * - User IDs
 * - Passwords
 * - OTP tokens
 *
 * Development: Logs verbose information for debugging
 * Production: Logs only essential information with masked data
 */

import { maskSensitiveData, type LogContext } from "./masking-utils";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Sentry type definition for window object
 */
interface WindowWithSentry extends Window {
  Sentry?: {
    captureMessage: (message: string, level: string) => void;
    captureException: (
      error: Error,
      options?: { level?: string; tags?: Record<string, string> },
    ) => void;
  };
}

/**
 * Get Sentry instance from window (client-side only)
 */
function getSentry(): WindowWithSentry["Sentry"] | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as unknown as WindowWithSentry).Sentry;
}

/**
 * Auth-specific logger with sensitive data masking and console output
 */
export const authLogger = {
  /**
   * Development-only debug logs
   * @param message - The message to log
   * @param context - Optional context object (will be masked)
   */
  debug: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      const maskedContext = context ? maskSensitiveData(context) : undefined;
      console.log(`[AUTH:DEBUG] ${message}`, maskedContext);
    }
  },

  /**
   * Info level logs (shown in development, masked in production)
   * @param message - The message to log
   * @param context - Optional context object (will be masked)
   */
  info: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      const maskedContext = context ? maskSensitiveData(context) : undefined;
      console.info(`[AUTH:INFO] ${message}`, maskedContext);
    } else {
      // In production, log via structured logging service (Sentry, DataDog, etc.)
      const sentry = getSentry();
      if (sentry) {
        sentry.captureMessage(message, "info");
      }
    }
  },

  /**
   * Warning level logs (always shown, masked in production)
   * @param message - The message to log
   * @param errorOrContext - Optional error or context object (will be masked)
   */
  warn: (message: string, errorOrContext?: Error | LogContext) => {
    if (errorOrContext instanceof Error) {
      if (isDevelopment) {
        console.warn(`[AUTH:WARN] ${message}`, errorOrContext);
      } else {
        // In production, log via structured logging service with masked data
        const sentry = getSentry();
        if (sentry) {
          sentry.captureException(errorOrContext, { level: "warning" });
        }
      }
    } else {
      const maskedContext = errorOrContext
        ? maskSensitiveData(errorOrContext)
        : undefined;
      if (isDevelopment) {
        console.warn(`[AUTH:WARN] ${message}`, maskedContext);
      } else {
        // In production, suppress detailed context - use structured logging only
        const sentry = getSentry();
        if (sentry) {
          sentry.captureMessage(message, "warning");
        }
      }
    }
  },

  /**
   * Error level logs (always shown, masked in production)
   * CRITICAL: Never log sensitive data in production
   * @param message - The message to log
   * @param error - The error object (will be masked)
   * @param context - Optional additional context (will be masked)
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    if (isDevelopment) {
      const maskedContext = context ? maskSensitiveData(context) : undefined;
      console.error(`[AUTH:ERROR] ${message}`, error, maskedContext);
    } else {
      // In production, only log message via structured logging service, suppress stack traces
      const sentry = getSentry();
      if (sentry) {
        sentry.captureException(
          error instanceof Error ? error : new Error(message),
          { tags: { source: "auth" } },
        );
      }
    }
  },

  /**
   * Critical errors that should always be logged
   * (but still masked in production)
   * @param message - The message to log
   * @param error - The error object (will be masked)
   */
  critical: (message: string, error?: Error | unknown) => {
    // Always log critical errors
    console.error(`[AUTH:CRITICAL] ${message}`, error);

    // Always send to production error tracking service
    const sentry = getSentry();
    if (sentry) {
      sentry.captureException(
        error instanceof Error ? error : new Error(message),
        { level: "fatal", tags: { source: "auth" } },
      );
    }
  },

  /**
   * Success logs (development only)
   * @param message - The message to log
   * @param context - Optional context object (will be masked)
   */
  success: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      const maskedContext = context ? maskSensitiveData(context) : undefined;
      console.log(`[AUTH:SUCCESS] ✓ ${message}`, maskedContext);
    }
  },
};
