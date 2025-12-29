'use server'

/**
 * Admin Role Types
 *
 * Defines role types for admin authentication.
 * Used by RoleGuard component for access control.
 */

export type AdminRole = 'super_admin' | 'admin' | 'teacher' | 'student'

