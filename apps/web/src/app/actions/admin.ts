'use server'

import { createAdminClient, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'

export interface SetAdminRoleResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Set admin role for a user by email
 * SECURITY: Requires super_admin role - only super admins can create other admins
 * Used to grant admin access to accounts
 */
export async function setAdminRole(email: string): Promise<SetAdminRoleResult> {
  try {
    // SECURITY: Verify caller is authenticated and authorized
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      authLogger.warn('[setAdminRole] Unauthorized: No authenticated user')
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // SECURITY: Only super_admin can grant admin roles
    const currentRole = currentUser.app_metadata?.role
    if (currentRole !== 'super_admin') {
      authLogger.warn('[setAdminRole] Forbidden: User lacks super_admin role', {
        userId: currentUser.id,
        role: currentRole,
      })
      return {
        success: false,
        error: 'Only super admins can grant admin access',
      }
    }

    const adminClient = await createAdminClient()

    // 1. Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      authLogger.error('[setAdminRole] Failed to list users', listError)
      return {
        success: false,
        error: 'Failed to access user database',
      }
    }

    // 2. Find the specific user
    const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      authLogger.warn('[setAdminRole] User not found', { email })
      return {
        success: false,
        error: `User with email ${email} not found`,
      }
    }

    // 3. Update user with admin role metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        role: 'admin',
      },
    })

    if (updateError) {
      authLogger.error('[setAdminRole] Failed to update user', updateError)
      return {
        success: false,
        error: 'Failed to set admin role',
      }
    }

    authLogger.success('[setAdminRole] Admin role set successfully', { email })
    return {
      success: true,
      message: `Admin role successfully set for ${email}`,
    }
  } catch (error) {
    authLogger.error('[setAdminRole] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Check if user has admin role
 */
export async function checkAdminRoleByEmail(email: string): Promise<{
  hasAdminRole: boolean
  error?: string
}> {
  try {
    const adminClient = await createAdminClient()

    // Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      return { hasAdminRole: false, error: 'Failed to check user role' }
    }

    const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      return { hasAdminRole: false, error: 'User not found' }
    }

    const role = user.app_metadata?.role
    const isAdmin = role === 'admin' || role === 'super_admin'
    return { hasAdminRole: isAdmin }
  } catch (error) {
    authLogger.error('[checkAdminRoleByEmail] Error', error)
    return { hasAdminRole: false, error: 'Failed to check role' }
  }
}
