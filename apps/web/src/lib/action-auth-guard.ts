/**
 * Auth Guard Wrapper for Server Actions
 * Standardizes authentication and rate limiting pattern across all actions
 */

import { AuthResult } from "@/lib/auth-result";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { authLogger } from "@/lib/auth-logger";
import {
  handleAuthError,
  handleRateLimitError,
  ActionResponse,
} from "./action-error-handler";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";

/**
 * Wrap a server action with auth verification and rate limiting
 *
 * @param actionName - Name of the action (for logging)
 * @param auth - Authentication result from verify*Auth()
 * @param operation - The actual operation to execute
 * @returns Either the operation result or an error response
 *
 * @example
 * ```typescript
 * const auth = await verifyTeacherAuth('createClass');
 * return withAuthGuard(
 *   'createClass',
 *   auth,
 *   async () => {
 *     // Your actual operation here
 *     return supabase.from('classes').insert(...);
 *   }
 * );
 * ```
 */
export async function withAuthGuard<T>(
  actionName: string,
  auth: AuthResult,
  operation: () => Promise<T>,
): Promise<T | ActionResponse> {
  // Check authorization
  if (!auth.authorized) {
    authLogger.warn(`[${actionName}] Unauthorized access attempt`, {
      userId: auth.user?.id,
    });
    return handleAuthError(
      auth.error || "You are not authorized to perform this action",
    );
  }

  // Check rate limit
  const rateLimitOk = await checkRateLimit(
    `action:${auth.user.id}`,
    RATE_LIMITS.dashboardStats,
  );
  if (!rateLimitOk) {
    return handleRateLimitError(actionName, auth.user.id);
  }

  // All checks passed, execute operation
  authLogger.debug(`[${actionName}] Executing action`, {
    userId: auth.user.id,
  });
  return operation();
}

/**
 * Variant that allows specifying custom rate limit function
 */
export async function withAuthGuardCustomRateLimit<T>(
  actionName: string,
  auth: AuthResult,
  customRateLimitCheck: (userId: string) => Promise<boolean>,
  operation: () => Promise<T>,
): Promise<T | ActionResponse> {
  // Check authorization
  if (!auth.authorized) {
    return handleAuthError(
      auth.error || "You are not authorized to perform this action",
    );
  }

  // Check custom rate limit
  const rateLimitOk = await customRateLimitCheck(auth.user.id);
  if (!rateLimitOk) {
    return handleRateLimitError(actionName, auth.user.id);
  }

  // All checks passed, execute operation
  return operation();
}
