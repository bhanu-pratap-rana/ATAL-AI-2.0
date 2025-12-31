'use server'

import { z } from 'zod'
import { createAdminClient, verifySuperAdminAuth } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkAdminOperationRateLimit } from '@/lib/rate-limiter-distributed'
import { AdminEmailSchema } from '@/lib/validation-schemas'

export interface DeleteUserResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Delete a user by email
 * WARNING: This is destructive and cannot be undone
 * SECURITY: Requires super_admin role
 */
export async function deleteUserByEmail(email: string): Promise<DeleteUserResult> {
  try {
    // Validate email input
    const normalizedEmail = AdminEmailSchema.parse(email)

    // SECURITY: Verify caller is authenticated and authorized as super_admin
    const auth = await verifySuperAdminAuth('deleteUserByEmail')
    if (!auth.authorized) {
      return auth.error!
    }

    // SECURITY: Rate limit admin operations to prevent abuse
    if (!(await checkAdminOperationRateLimit(auth.user!.id))) {
      authLogger.warn('[deleteUserByEmail] Rate limit exceeded', { userId: auth.user!.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const adminClient = await createAdminClient()

    // 1. Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      authLogger.error('[deleteUserByEmail] Failed to list users', listError)
      return {
        success: false,
        error: 'Failed to access user database',
      }
    }

    const user = users?.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      authLogger.warn('[deleteUserByEmail] User not found', { email })
      return {
        success: false,
        error: `User with email ${email} not found`,
      }
    }

    // 2. Delete the user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      authLogger.error('[deleteUserByEmail] Failed to delete user', deleteError)
      return {
        success: false,
        error: deleteError.message || 'Failed to delete user',
      }
    }

    authLogger.success('[deleteUserByEmail] User deleted successfully', { email })
    return {
      success: true,
      message: `User ${email} has been deleted. You can now create a new account with this email.`,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[deleteUserByEmail] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
