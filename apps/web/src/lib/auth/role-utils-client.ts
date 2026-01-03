/**
 * Client-side role checking utilities
 * Re-exports from role-utils.ts with "Client" suffix for backward compatibility
 *
 * These functions work identically on both server and client since they perform
 * simple string comparisons. The "Client" suffix is kept for existing imports.
 */

import {
  isTeacherOrHigher,
  isAdmin,
  isSuperAdmin,
  hasMinimumRole,
} from './role-utils'

/**
 * @deprecated Use isTeacherOrHigher from role-utils instead
 * Check if a role is a teacher or higher (teacher, admin, super_admin)
 */
export const isTeacherOrHigherClient = isTeacherOrHigher

/**
 * @deprecated Use isAdmin from role-utils instead
 * Check if a role is an admin or super_admin
 */
export const isAdminClient = isAdmin

/**
 * @deprecated Use isSuperAdmin from role-utils instead
 * Check if a role is super_admin only
 */
export const isSuperAdminClient = isSuperAdmin

/**
 * @deprecated Use hasMinimumRole from role-utils instead
 * Check if user has a minimum role level using role hierarchy
 */
export const hasMinimumRoleClient = hasMinimumRole
