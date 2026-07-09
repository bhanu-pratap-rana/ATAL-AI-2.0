/**
 * Centralized role checking utilities
 * Eliminates duplicate role validation logic across the codebase
 *
 * Use these functions instead of inline role checks like:
 * - role === 'teacher' || role === 'admin' || role === 'super_admin'
 * - role === 'admin' || role === 'super_admin'
 * - role === 'super_admin'
 */

/**
 * Check if a role is a teacher or higher (teacher, admin, super_admin)
 *
 * @param role - The user's role
 * @returns true if user is a teacher or higher
 *
 * @example
 * const isTeacher = isTeacherOrHigher(user.app_metadata?.role)
 * if (isTeacher) {
 *   // Show teacher dashboard
 * }
 */
export function isTeacherOrHigher(role: string | undefined | null): boolean {
  return role === "teacher" || role === "admin" || role === "super_admin";
}

/**
 * Check if a role is an admin or super_admin
 *
 * @param role - The user's role
 * @returns true if user is an admin or super_admin
 *
 * @example
 * const isAdmin = isAdmin(user.app_metadata?.role)
 * if (isAdmin) {
 *   // Show admin panel
 * }
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * Check if a role is super_admin only
 *
 * @param role - The user's role
 * @returns true if user is a super_admin
 *
 * @example
 * const isSuperAdmin = isSuperAdmin(user.app_metadata?.role)
 * if (isSuperAdmin) {
 *   // Show super admin features
 * }
 */
export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === "super_admin";
}

/**
 * Check if a role is a student
 *
 * @param role - The user's role
 * @returns true if user is a student
 */
export function isStudent(role: string | undefined | null): boolean {
  return role === "student";
}
