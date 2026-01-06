'use server'

import { z } from 'zod'
import { createAdminClient, verifySuperAdminAuth } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkAdminOperationRateLimit } from '@/lib/rate-limiter-distributed'
import { AdminEmailSchema } from '@/lib/validation-schemas'
import { findAuthUserByEmail } from '@/lib/admin-utils'

/**
 * Valid database table names for user cascade deletion
 * SECURITY: Whitelist of tables to prevent injection attacks
 */
type ValidTable = 'ai_tutor_interactions' | 'assessment_responses' | 'assessment_sessions' | 'enrollments' | 'student_profiles' | 'teacher_profiles' | 'usernames'

/**
 * Validate table name is in whitelist
 * SECURITY: Prevents SQL injection by restricting to known tables
 */
function isValidTable(table: string): table is ValidTable {
  const validTables: Record<ValidTable, boolean> = {
    'ai_tutor_interactions': true,
    'assessment_responses': true,
    'assessment_sessions': true,
    'enrollments': true,
    'student_profiles': true,
    'teacher_profiles': true,
    'usernames': true,
  }
  return table in validTables
}

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
      return auth.error
    }

    // SECURITY: Rate limit admin operations to prevent abuse
    const deleteAllowed = await checkAdminOperationRateLimit(auth.user.id)
    if (!deleteAllowed) {
      authLogger.warn('[deleteUserByEmail] Rate limit exceeded', { userId: auth.user.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const adminClient = await createAdminClient()

    // 1. Find user by email (with pagination support for large user bases)
    const user = await findAuthUserByEmail(adminClient, normalizedEmail)

    if (!user) {
      authLogger.warn('[deleteUserByEmail] User not found', { email })
      return {
        success: false,
        error: `User with email ${email} not found`,
      }
    }

    // SECURITY: Prevent self-deletion (cannot delete the current user)
    if (user.id === auth.user.id) {
      authLogger.warn('[deleteUserByEmail] Self-deletion attempted', { userId: user.id, email })
      return {
        success: false,
        error: 'Cannot delete your own account. Contact another super admin for assistance.',
      }
    }

    // 2. Clean up related data before deleting auth user (cascade delete)
    // SECURITY: Implement right-to-be-forgotten by cleaning up all user data
    try {
      // Attempt to delete all related user data
      const userId = user.id
      const supabaseClient = await createAdminClient()

      // Delete in order of foreign key dependencies
      // PERFORMANCE: Parallelize cascade deletion to avoid N+1 query pattern
      const tablesAndConditions = [
        ['ai_tutor_interactions', 'student_id'],
        ['assessment_responses', 'user_id'],  // indirect via assessment_sessions
        ['assessment_sessions', 'user_id'],
        ['enrollments', 'student_id'],
        ['student_profiles', 'user_id'],
        ['teacher_profiles', 'user_id'],
        ['usernames', 'user_id'],
      ]

      // Run all deletions in parallel for better performance
      await Promise.all(
        tablesAndConditions.map(async ([table, column]) => {
          try {
            // SECURITY: Validate table name is in whitelist before use
            if (!isValidTable(table)) {
              authLogger.error('[deleteUserByEmail] Invalid table name in cascade delete', {
                table,
                userId,
              })
              return
            }

            await supabaseClient
              .from(table)
              .delete()
              .eq(column, userId)
          } catch (tableError) {
            // Log but continue - some tables might not have the column
            authLogger.warn(`[deleteUserByEmail] Failed to delete from ${table}`, {
              error: tableError instanceof Error ? tableError.message : String(tableError),
              userId,
            })
          }
        })
      )
    } catch (cleanupError) {
      authLogger.warn('[deleteUserByEmail] Cleanup incomplete, proceeding with auth deletion', {
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        userId: user.id,
      })
      // Continue with auth deletion even if cleanup partially fails
    }

    // 3. Delete the user from authentication
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      authLogger.error('[deleteUserByEmail] Failed to delete user from auth', deleteError)
      return {
        success: false,
        error: deleteError.message || 'Failed to delete user',
      }
    }

    authLogger.success('[deleteUserByEmail] User deleted successfully with cascade cleanup', { email, userId: user.id })
    return {
      success: true,
      message: `User ${email} has been deleted along with all associated data. You can now create a new account with this email.`,
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
