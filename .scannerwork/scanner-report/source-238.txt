"use server";

import { createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";

/**
 * Standard Action Result Format
 * All server actions should return this format for consistency
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute a server action with standardized error handling
 *
 * This wrapper:
 * - Executes the handler function
 * - Catches any errors and logs them
 * - Returns standardized result format
 * - Never throws (always returns ActionResult)
 *
 * @param handler - The async function to execute
 * @param context - Context string for logging (e.g., '[getTeacherDashboard]')
 * @returns ActionResult with success/data or success/error
 *
 * @example
 * ```typescript
 * export async function getTeacherDashboard(classId: string) {
 *   return executeAction(async () => {
 *     const { data, error } = await supabase.from('classes').select('*')
 *     if (error) throw error
 *     return data
 *   }, '[getTeacherDashboard]')
 * }
 * ```
 */
export async function executeAction<T>(
  handler: () => Promise<T>,
  context: string,
): Promise<ActionResult<T>> {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    authLogger.error(`${context} - Action failed`, { error: message });
    return { success: false, error: message };
  }
}

/**
 * Get current authenticated user with error handling
 *
 * Returns a discriminated union type for type-safe handling:
 * - { success: true, user } if authenticated
 * - { success: false, error } if not authenticated
 *
 * @returns User info or error
 *
 * @example
 * ```typescript
 * export async function getDashboard() {
 *   return executeAction(async () => {
 *     const auth = await verifyAuth()
 *     if (!auth.success) throw new Error(auth.error)
 *
 *     const userId = auth.user.id
 *     // ... rest of logic
 *   }, '[getDashboard]')
 * }
 * ```
 */
export async function verifyAuth(): Promise<
  | { success: true; user: { id: string; email?: string } }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, error: "Unauthorized" };
    }

    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error) {
    authLogger.error(
      "[verifyAuth] Exception",
      error instanceof Error ? error : { error },
    );
    return { success: false, error: "Authentication check failed" };
  }
}

/**
 * Verify specific user role (admin, teacher, student)
 *
 * @param requiredRole - The role to check for
 * @returns User with role verified, or error
 *
 * @example
 * ```typescript
 * const auth = await verifyRole('admin')
 * if (!auth.success) throw new Error(auth.error)
 * // Now we know user is admin
 * ```
 */
export async function verifyRole(
  requiredRole: "admin" | "teacher" | "student",
): Promise<
  | { success: true; user: { id: string; email?: string } }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const userRole = user.app_metadata?.role;
    if (userRole !== requiredRole) {
      return { success: false, error: `Requires ${requiredRole} role` };
    }

    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error) {
    authLogger.error(
      `[verifyRole:${requiredRole}] Exception`,
      error instanceof Error ? error : { error },
    );
    return { success: false, error: "Role verification failed" };
  }
}

/**
 * Validate input object against required fields
 *
 * @param data - Object to validate
 * @param requiredFields - Array of required field names
 * @returns true if all fields present, false otherwise
 *
 * @example
 * ```typescript
 * if (!validateRequired({ name, email }, ['name', 'email'])) {
 *   throw new Error('Missing required fields')
 * }
 * ```
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[],
): boolean {
  for (const field of requiredFields) {
    if (!data[field]) {
      authLogger.warn("[validateRequired] Missing field", { field });
      return false;
    }
  }
  return true;
}

/**
 * Safe database query execution with error logging
 *
 * @param fn - The query function to execute
 * @param context - Context for logging
 * @returns Query result data or throws error
 *
 * @example
 * ```typescript
 * const data = await executeQuery(
 *   () => supabase.from('users').select('*'),
 *   '[getUsers]'
 * )
 * ```
 */
export async function executeQuery<T>(
  fn: () => Promise<{ data: T; error: Error | null }>,
  context: string,
): Promise<T> {
  const { data, error } = await fn();

  if (error) {
    authLogger.error(`${context} - Query failed`, { error: error.message });
    throw new Error(error.message || "Database query failed");
  }

  if (!data) {
    authLogger.warn(`${context} - No data returned`);
    throw new Error("No data returned from database");
  }

  return data;
}
