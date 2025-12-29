'use server'

import { z } from 'zod'
import { createAdminClient, verifySuperAdminAuth } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { AdminEmailSchema } from '@/lib/validation-schemas'

export interface SetAdminRoleResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Set admin role for an existing user by email
 * SECURITY: Requires super_admin role
 *
 * Note: For creating new admin accounts with password, use createAdminAccount from admin-management.ts
 * This function is for promoting existing users to admin role (used by setup page).
 */
export async function setAdminRole(email: string): Promise<SetAdminRoleResult> {
  try {
    // Validate email input
    const normalizedEmail = AdminEmailSchema.parse(email)

    // SECURITY: Verify caller is authenticated and authorized as super_admin
    const auth = await verifySuperAdminAuth('setAdminRole')
    if (!auth.authorized) {
      return auth.error!
    }

    const adminClient = await createAdminClient()

    // Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      authLogger.error('[setAdminRole] Failed to list users', listError)
      return {
        success: false,
        error: 'Failed to access user database',
      }
    }

    const user = users?.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      authLogger.warn('[setAdminRole] User not found', { email: normalizedEmail })
      return {
        success: false,
        error: `User with email ${email} not found`,
      }
    }

    // Check if already admin
    const existingRole = user.app_metadata?.role
    if (existingRole === 'admin' || existingRole === 'super_admin') {
      return {
        success: true,
        message: `User ${email} already has ${existingRole} role`,
      }
    }

    // Update user with admin role
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
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

    authLogger.success('[setAdminRole] Admin role set successfully', { email: normalizedEmail })
    return {
      success: true,
      message: `Admin role successfully set for ${email}`,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[setAdminRole] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Check if user has admin role
 * Lightweight check that doesn't require full admin operations
 */
export async function checkAdminRoleByEmail(email: string): Promise<{
  hasAdminRole: boolean
  error?: string
}> {
  try {
    // Validate email input
    const normalizedEmail = AdminEmailSchema.parse(email)

    const adminClient = await createAdminClient()

    // Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      return { hasAdminRole: false, error: 'Failed to check user role' }
    }

    const user = users?.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      return { hasAdminRole: false, error: 'User not found' }
    }

    const role = user.app_metadata?.role
    const isAdmin = role === 'admin' || role === 'super_admin'
    return { hasAdminRole: isAdmin }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { hasAdminRole: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[checkAdminRoleByEmail] Error', error)
    return { hasAdminRole: false, error: 'Failed to check role' }
  }
}
