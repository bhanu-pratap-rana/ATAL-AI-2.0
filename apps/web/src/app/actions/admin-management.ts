'use server'

import { createAdminClient, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import { checkRateLimit as checkDistributedRateLimit } from '@/lib/rate-limiter-distributed'
import { EMAIL_REGEX } from '@/lib/auth-constants'

// Use centralized rate limit config for admin operations
const ADMIN_RATE_LIMIT = RATE_LIMITS.adminOperations

export interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'admin'
  created_at: string
  last_sign_in_at?: string
}

export interface AdminActionResult {
  success: boolean
  message?: string
  error?: string
  data?: unknown
}

/**
 * Check if current user is super admin
 * SECURITY: Uses getCurrentUser() to get authenticated user from session
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return false
    }

    const role = currentUser.app_metadata?.role
    return role === 'super_admin'
  } catch (error) {
    authLogger.error('[isSuperAdmin] Error checking super admin status', error)
    return false
  }
}

/**
 * Get current user's admin role
 * SECURITY: Uses getCurrentUser() to get authenticated user from session
 */
export async function getCurrentAdminRole(): Promise<'super_admin' | 'admin' | null> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return null
    }

    const role = currentUser.app_metadata?.role
    if (role === 'super_admin' || role === 'admin') {
      return role
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
    // SECURITY: Verify caller is authenticated and authorized
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      authLogger.warn('[createAdminAccount] Unauthorized: No authenticated user')
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // SECURITY: Only super_admin can create admin accounts
    const currentRole = currentUser.app_metadata?.role
    if (currentRole !== 'super_admin') {
      authLogger.warn('[createAdminAccount] Forbidden: User lacks super_admin role', {
        userId: currentUser.id,
        role: currentRole,
      })
      return {
        success: false,
        error: 'Only super admins can create admin accounts',
      }
    }

    // Rate limiting using distributed rate limiter
    const rateLimitKey = `admin:create:${email}`
    const isAllowed = await checkDistributedRateLimit(rateLimitKey, ADMIN_RATE_LIMIT)
    if (!isAllowed) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
      }
    }

    const adminClient = await createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()

    // Validate email using centralized regex
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      }
    }

    // Validate password
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      }
    }

    // Check if user already exists
    const { data: users } = await adminClient.auth.admin.listUsers()
    const existingUser = users?.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

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
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        app_metadata: {
          ...existingUser.app_metadata,
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

    // Set admin role
    const { error: updateError } = await adminClient.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        role: role,
      },
    })

    if (updateError) {
      authLogger.error('[createAdminAccount] Failed to set admin role', updateError)
      return {
        success: false,
        error: 'Failed to set admin role',
      }
    }

    authLogger.success('[createAdminAccount] Admin account created', { email: normalizedEmail, role })
    return {
      success: true,
      message: `Admin account created for ${email}`,
      data: { userId: data.user.id },
    }
  } catch (error) {
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
    // SECURITY: Verify caller is authenticated and authorized
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      authLogger.warn('[listAdminAccounts] Unauthorized: No authenticated user')
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // SECURITY: Only super_admin can list admin accounts
    const currentRole = currentUser.app_metadata?.role
    if (currentRole !== 'super_admin') {
      authLogger.warn('[listAdminAccounts] Forbidden: User lacks super_admin role', {
        userId: currentUser.id,
        role: currentRole,
      })
      return {
        success: false,
        error: 'Only super admins can view admin accounts',
      }
    }

    const adminClient = await createAdminClient()
    const { data: userData, error } = await adminClient.auth.admin.listUsers()

    if (error) {
      authLogger.error('[listAdminAccounts] Failed to list users', error)
      return {
        success: false,
        error: 'Failed to fetch admin accounts',
      }
    }

    if (!userData?.users) {
      return {
        success: true,
        data: [],
      }
    }

    // Filter for admins only
    const admins: AdminUser[] = userData.users
      .filter((user) => {
        const role = (user.app_metadata?.role as string) || 'user'
        return role === 'admin' || role === 'super_admin'
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
    // SECURITY: Verify caller is authenticated and authorized
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      authLogger.warn('[deleteAdminAccount] Unauthorized: No authenticated user')
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // SECURITY: Only super_admin can delete admin accounts
    const currentRole = currentUser.app_metadata?.role
    if (currentRole !== 'super_admin') {
      authLogger.warn('[deleteAdminAccount] Forbidden: User lacks super_admin role', {
        userId: currentUser.id,
        role: currentRole,
      })
      return {
        success: false,
        error: 'Only super admins can delete admin accounts',
      }
    }

    // SECURITY: Prevent self-deletion
    if (adminId === currentUser.id) {
      authLogger.warn('[deleteAdminAccount] Forbidden: Cannot delete own account', {
        userId: currentUser.id,
      })
      return {
        success: false,
        error: 'Cannot delete your own account',
      }
    }

    // Rate limiting using distributed rate limiter
    const isAllowed = await checkDistributedRateLimit(`admin:delete:${adminId}`, ADMIN_RATE_LIMIT)
    if (!isAllowed) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
      }
    }

    const adminClient = await createAdminClient()

    // Get the user to check role
    const { data: users } = await adminClient.auth.admin.listUsers()
    const userToDelete = users?.users.find((u) => u.id === adminId)

    if (!userToDelete) {
      return {
        success: false,
        error: 'Admin account not found',
      }
    }

    const role = (userToDelete.app_metadata?.role as string) || 'user'

    // Prevent deletion of super admins
    if (role === 'super_admin') {
      return {
        success: false,
        error: 'Cannot delete super admin accounts',
      }
    }

    // Delete the user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(adminId)

    if (deleteError) {
      authLogger.error('[deleteAdminAccount] Failed to delete user', deleteError)
      return {
        success: false,
        error: deleteError.message || 'Failed to delete admin account',
      }
    }

    authLogger.success('[deleteAdminAccount] Admin account deleted', { adminId })
    return {
      success: true,
      message: `Admin account deleted successfully`,
    }
  } catch (error) {
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
    // SECURITY: Verify caller is authenticated
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      authLogger.warn('[resetAdminPassword] Unauthorized: No authenticated user')
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // SECURITY: Check authorization - super_admin can reset any, others only own
    const currentRole = currentUser.app_metadata?.role
    const isAdmin = currentRole === 'admin' || currentRole === 'super_admin'

    if (!isAdmin) {
      authLogger.warn('[resetAdminPassword] Forbidden: User is not an admin', {
        userId: currentUser.id,
        role: currentRole,
      })
      return {
        success: false,
        error: 'Only admins can reset passwords',
      }
    }

    // Regular admins can only reset their own password
    if (currentRole === 'admin' && adminId !== currentUser.id) {
      authLogger.warn('[resetAdminPassword] Forbidden: Admin cannot reset other passwords', {
        userId: currentUser.id,
        targetId: adminId,
      })
      return {
        success: false,
        error: 'You can only reset your own password',
      }
    }

    // Rate limiting using distributed rate limiter
    const isAllowed = await checkDistributedRateLimit(`admin:reset:${adminId}`, ADMIN_RATE_LIMIT)
    if (!isAllowed) {
      return {
        success: false,
        error: 'Too many password reset attempts. Please try again later.',
      }
    }

    // Validate password
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      }
    }

    const adminClient = await createAdminClient()

    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(adminId, {
      password: newPassword,
    })

    if (updateError) {
      authLogger.error('[resetAdminPassword] Failed to reset password', updateError)
      return {
        success: false,
        error: updateError.message || 'Failed to reset password',
      }
    }

    authLogger.success('[resetAdminPassword] Admin password reset', { adminId })
    return {
      success: true,
      message: 'Password reset successfully',
    }
  } catch (error) {
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
    const adminClient = await createAdminClient()
    const { data: users } = await adminClient.auth.admin.listUsers()

    if (!users?.users) {
      return false
    }

    const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      return false
    }

    const role = (user.app_metadata?.role as string) || 'user'
    return role === 'super_admin'
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
    // SECURITY: Verify caller is authenticated and authorized
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      authLogger.warn('[getAdminById] Unauthorized: No authenticated user')
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // SECURITY: Only super_admin can view admin details
    const currentRole = currentUser.app_metadata?.role
    if (currentRole !== 'super_admin') {
      authLogger.warn('[getAdminById] Forbidden: User lacks super_admin role', {
        userId: currentUser.id,
        role: currentRole,
      })
      return {
        success: false,
        error: 'Only super admins can view admin details',
      }
    }

    const adminClient = await createAdminClient()
    const { data: users } = await adminClient.auth.admin.listUsers()

    const user = users?.users.find((u) => u.id === adminId)
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
    authLogger.error('[getAdminById] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}


