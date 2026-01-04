'use server'

import { z } from 'zod'
import { createAdminClient, verifySuperAdminAuth, verifyAdminAuth, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import { checkRateLimit as checkDistributedRateLimit } from '@/lib/rate-limiter-distributed'
import { isSuperAdmin, isAdmin } from '@/lib/auth/role-utils'
import { AdminEmailSchema, AdminPasswordSchema, UserIdSchema } from '@/lib/validation-schemas'
import type { SupabaseAuthUser } from '@/lib/admin-utils'

// Use centralized rate limit config for admin operations
const ADMIN_RATE_LIMIT = RATE_LIMITS.adminOperations

export interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'admin'
  created_at: unknown
  last_sign_in_at?: unknown
}

export interface AdminActionResult {
  success: boolean
  message?: string
  error?: string
  data?: unknown
}

/**
 * Helper function to fetch all users with pagination
 * Supabase admin API has 1000 user limit per request, so we need to paginate
 * @internal
 */
async function fetchAllAdminUsers(adminClient: Awaited<ReturnType<typeof createAdminClient>>) {
  const allUsers: SupabaseAuthUser[] = []
  let page = 1
  const perPage = 1000

  try {
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        perPage,
        page,
      })

      if (error) {
        authLogger.error('[fetchAllAdminUsers] Error fetching users page', {
          page,
          error: error.message,
        })
        break
      }

      if (!data?.users || data.users.length === 0) {
        break
      }

      allUsers.push(...(data.users as unknown as SupabaseAuthUser[]))

      // If we got fewer users than requested, we've reached the end
      if (data.users.length < perPage) {
        break
      }

      page++
    }

    return allUsers
  } catch (error) {
    authLogger.error('[fetchAllAdminUsers] Unexpected error', error)
    return allUsers // Return what we got so far
  }
}

/**
 * Check if current user is super admin
 * SECURITY: Uses getCurrentUser() to get authenticated user from session
 *
 * @internal Reserved for future UI conditional rendering
 * @returns true if current user has super_admin role
 */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return false
    }

    const role = currentUser.app_metadata?.role as string | null | undefined
    return isSuperAdmin(role)
  } catch (error) {
    authLogger.error('[isCurrentUserSuperAdmin] Error checking super admin status', error)
    return false
  }
}

/**
 * Get current user's admin role
 * SECURITY: Uses getCurrentUser() to get authenticated user from session
 *
 * @internal Reserved for future role-based UI rendering
 * @returns 'super_admin', 'admin', or null if not an admin
 */
export async function getCurrentAdminRole(): Promise<'super_admin' | 'admin' | null> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return null
    }

    const role = currentUser.app_metadata?.role as string | null | undefined
    if (isAdmin(role)) {
      return role as 'admin' | 'super_admin'
    }
    return null
  } catch (error) {
    authLogger.error('[getCurrentAdminRole] Error getting admin role', error)
    return null
  }
}

/**
 * Create a new admin account
 * SECURITY: Only super_admin can create new admins
 */
export async function createAdminAccount(
  email: string,
  password: string,
  role: 'admin' | 'super_admin' = 'admin'
): Promise<AdminActionResult> {
  try {
    // Validate inputs using Zod schemas
    const normalizedEmail = AdminEmailSchema.parse(email)
    AdminPasswordSchema.parse(password)

    // SECURITY: Verify caller is authenticated and authorized as super_admin
    const auth = await verifySuperAdminAuth('createAdminAccount')
    if (!auth.authorized) {
      return auth.error
    }

    // Rate limiting using distributed rate limiter
    const rateLimitKey = `admin:create:${normalizedEmail}`
    const isAllowed = await checkDistributedRateLimit(rateLimitKey, ADMIN_RATE_LIMIT)
    if (!isAllowed) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
      }
    }

    const adminClient = await createAdminClient()

    // Check if user already exists (using pagination helper for large user bases)
    const allUsers = await fetchAllAdminUsers(adminClient)
    const existingUser = allUsers.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      // User exists - check if already an admin
      const currentRole = existingUser.app_metadata?.role as string
      if (currentRole === 'admin' || currentRole === 'super_admin') {
        return {
          success: false,
          error: `User ${email} is already an ${currentRole === 'super_admin' ? 'Super Admin' : 'Admin'}`,
        }
      }

      // SECURITY: Check if user is a student - students cannot be promoted to admin
      // Only teachers can be promoted to admin role
      const { data: studentProfile } = await adminClient
        .from('student_profiles')
        .select('user_id')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      const { data: teacherProfile } = await adminClient
        .from('teacher_profiles')
        .select('user_id')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      // Block: Student email cannot become admin (has student profile but no teacher profile)
      if (studentProfile && !teacherProfile) {
        authLogger.warn('[createAdminAccount] Blocked: Cannot promote student to admin', {
          email: normalizedEmail,
          userId: existingUser.id,
        })
        return {
          success: false,
          error: 'This email is registered as a student account. Only teachers can be promoted to admin.',
        }
      }

      // Promote existing user to admin (teacher becoming admin)
      // SECURITY: Re-check user state to prevent race condition
      // (Another concurrent request might have changed the user's role)
      const { data, error: recheckError } = await adminClient.auth.admin.getUserById(existingUser.id)
      const recheck = data?.user

      if (recheckError || !recheck) {
        authLogger.warn('[createAdminAccount] User disappeared during operation', { userId: existingUser.id })
        return {
          success: false,
          error: 'User no longer exists. Please try again.',
        }
      }

      const recheckRole = recheck.app_metadata?.role as string
      if (recheckRole === 'admin' || recheckRole === 'super_admin') {
        authLogger.warn('[createAdminAccount] User already promoted by concurrent request', {
          email: normalizedEmail,
          userId: existingUser.id,
          role: recheckRole,
        })
        return {
          success: true,
          message: `${email} is already an ${recheckRole === 'super_admin' ? 'Super Admin' : 'Admin'}`,
          data: { userId: existingUser.id, promoted: false },
        }
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        app_metadata: {
          ...recheck.app_metadata,  // Use rechecked metadata, not stale data
          role: role,
        },
      })

      if (updateError) {
        authLogger.error('[createAdminAccount] Failed to promote user to admin', updateError)
        return {
          success: false,
          error: 'Failed to promote user to admin',
        }
      }

      authLogger.success('[createAdminAccount] User promoted to admin', { email: normalizedEmail, role, previousRole: currentRole || 'user' })
      return {
        success: true,
        message: `${email} has been promoted to ${role === 'super_admin' ? 'Super Admin' : 'Admin'}`,
        data: { userId: existingUser.id, promoted: true },
      }
    }

    // Create new user
    const { data, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    })

    if (createError || !data.user) {
      authLogger.error('[createAdminAccount] Failed to create user', createError)
      return {
        success: false,
        error: createError?.message || 'Failed to create user account',
      }
    }

    const newUserId = data.user.id

    // Set admin role
    const { error: updateError } = await adminClient.auth.admin.updateUserById(newUserId, {
      app_metadata: {
        role: role,
      },
    })

    if (updateError) {
      // ERROR RECOVERY: Rollback - delete created user since role update failed
      authLogger.error('[createAdminAccount] Failed to set admin role, initiating rollback', updateError)

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(newUserId)
      if (deleteError) {
        authLogger.error('[createAdminAccount] CRITICAL: Rollback failed, orphaned user created', {
          userId: newUserId,
          email: normalizedEmail,
          deleteError: deleteError.message,
        })
        return {
          success: false,
          error: 'Failed to configure admin account and rollback failed. Manual intervention required.',
        }
      }

      authLogger.warn('[createAdminAccount] Rollback successful, user deleted', { userId: newUserId })
      return {
        success: false,
        error: 'Failed to set admin role. Account creation rolled back.',
      }
    }

    authLogger.success('[createAdminAccount] Admin account created', { email: normalizedEmail, role })
    return {
      success: true,
      message: `Admin account created for ${email}`,
      data: { userId: newUserId },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[createAdminAccount] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * List all admin accounts
 * SECURITY: Only super_admin can see this list
 */
export async function listAdminAccounts(): Promise<AdminActionResult> {
  try {
    // SECURITY: Verify caller is authenticated and authorized as super_admin
    const auth = await verifySuperAdminAuth('listAdminAccounts')
    if (!auth.authorized) {
      return auth.error
    }

    const adminClient = await createAdminClient()
    // List all users with full pagination support
    const allUsers = await fetchAllAdminUsers(adminClient)

    if (!allUsers || allUsers.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    // Filter for admins only
    const admins: AdminUser[] = allUsers
      .filter((user) => {
        const role = user.app_metadata?.role as string | null | undefined
        return isAdmin(role)
      })
      .map((user) => ({
        id: user.id,
        email: user.email || '',
        role: ((user.app_metadata?.role as string) || 'admin') as 'admin' | 'super_admin',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      }))

    return {
      success: true,
      data: admins,
    }
  } catch (error) {
    authLogger.error('[listAdminAccounts] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Delete an admin account
 * SECURITY: Only super_admin can delete, cannot delete themselves or other super admins
 */
export async function deleteAdminAccount(adminId: string): Promise<AdminActionResult> {
  try {
    // Validate input
    const validatedId = UserIdSchema.parse(adminId)

    // SECURITY: Verify caller is authenticated and authorized as super_admin
    const auth = await verifySuperAdminAuth('deleteAdminAccount')
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Prevent self-deletion
    if (validatedId === auth.user.id) {
      authLogger.warn('[deleteAdminAccount] Forbidden: Cannot delete own account', {
        userId: auth.user.id,
      })
      return {
        success: false,
        error: 'Cannot delete your own account',
      }
    }

    // Rate limiting using distributed rate limiter
    const isAllowed = await checkDistributedRateLimit(`admin:delete:${validatedId}`, ADMIN_RATE_LIMIT)
    if (!isAllowed) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
      }
    }

    const adminClient = await createAdminClient()

    // Get the user to check role (with full pagination support for large user bases)
    const allUsers = await fetchAllAdminUsers(adminClient)
    const userToDelete = allUsers.find((u) => u.id === validatedId)

    if (!userToDelete) {
      return {
        success: false,
        error: 'Admin account not found',
      }
    }

    const role = userToDelete.app_metadata?.role as string | null | undefined

    // Prevent deletion of super admins
    if (isSuperAdmin(role)) {
      return {
        success: false,
        error: 'Cannot delete super admin accounts',
      }
    }

    // Delete the user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(validatedId)

    if (deleteError) {
      authLogger.error('[deleteAdminAccount] Failed to delete user', deleteError)
      return {
        success: false,
        error: deleteError.message || 'Failed to delete admin account',
      }
    }

    authLogger.success('[deleteAdminAccount] Admin account deleted', { adminId: validatedId })
    return {
      success: true,
      message: `Admin account deleted successfully`,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[deleteAdminAccount] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Reset admin password
 * SECURITY: Super_admin can reset any admin's password, regular admins only their own
 */
export async function resetAdminPassword(adminId: string, newPassword: string): Promise<AdminActionResult> {
  try {
    // Validate inputs using Zod schemas
    const validatedId = UserIdSchema.parse(adminId)
    AdminPasswordSchema.parse(newPassword)

    // SECURITY: Verify caller is authenticated and is an admin
    const auth = await verifyAdminAuth('resetAdminPassword')
    if (!auth.authorized) {
      return auth.error
    }

    // Regular admins can only reset their own password
    const currentRole = auth.user.app_metadata?.role
    if (currentRole === 'admin' && validatedId !== auth.user.id) {
      authLogger.warn('[resetAdminPassword] Forbidden: Admin cannot reset other passwords', {
        userId: auth.user.id,
        targetId: validatedId,
      })
      return {
        success: false,
        error: 'You can only reset your own password',
      }
    }

    // Rate limiting using distributed rate limiter
    const isAllowed = await checkDistributedRateLimit(`admin:reset:${validatedId}`, ADMIN_RATE_LIMIT)
    if (!isAllowed) {
      return {
        success: false,
        error: 'Too many password reset attempts. Please try again later.',
      }
    }

    const adminClient = await createAdminClient()

    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(validatedId, {
      password: newPassword,
    })

    if (updateError) {
      authLogger.error('[resetAdminPassword] Failed to reset password', updateError)
      return {
        success: false,
        error: updateError.message || 'Failed to reset password',
      }
    }

    authLogger.success('[resetAdminPassword] Admin password reset', { adminId: validatedId })
    return {
      success: true,
      message: 'Password reset successfully',
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[resetAdminPassword] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Check if email is super admin
 */
export async function isSuperAdminEmail(email: string): Promise<boolean> {
  try {
    // Validate email input
    const normalizedEmail = AdminEmailSchema.parse(email)

    const adminClient = await createAdminClient()
    // Fetch all users with proper pagination support for scalability
    const allUsers = await fetchAllAdminUsers(adminClient)

    if (!allUsers || allUsers.length === 0) {
      return false
    }

    const user = allUsers.find((u) => u.email?.toLowerCase() === normalizedEmail)
    if (!user) {
      return false
    }

    const role = user.app_metadata?.role as string | null | undefined
    return isSuperAdmin(role)
  } catch (error) {
    authLogger.error('[isSuperAdminEmail] Error checking super admin email', error)
    return false
  }
}

/**
 * Get admin details by ID
 * SECURITY: Requires super_admin role
 */
export async function getAdminById(adminId: string): Promise<AdminActionResult> {
  try {
    // Validate input
    const validatedId = UserIdSchema.parse(adminId)

    // SECURITY: Verify caller is authenticated and authorized as super_admin
    const auth = await verifySuperAdminAuth('getAdminById')
    if (!auth.authorized) {
      return auth.error
    }

    const adminClient = await createAdminClient()
    // List users with full pagination support for scalability
    const allUsers = await fetchAllAdminUsers(adminClient)

    const user = allUsers.find((u) => u.id === validatedId)
    if (!user) {
      return {
        success: false,
        error: 'Admin not found',
      }
    }

    const admin: AdminUser = {
      id: user.id,
      email: user.email || '',
      role: ((user.app_metadata?.role as string) || 'admin') as 'admin' | 'super_admin',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }

    return {
      success: true,
      data: admin,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[getAdminById] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}


