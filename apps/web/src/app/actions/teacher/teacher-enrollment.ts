'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, verifyClassOwnership } from '@/lib/supabase-server'
import { checkTeacherMutationRateLimit } from '@/lib/rate-limiter-distributed'
import {
  EnrollmentSchema,
  ClassIdSchema,
} from '@/lib/validation-schemas'
import { authLogger } from '@/lib/auth-logger'
import { handleZodError } from '@/lib/action-error-handler'

/**
 * Student enrollment management for teacher classes
 * Handles enrolling and removing students from classes
 */

export async function enrollStudent(classId: string, studentId: string) {
  try {
    // Validate inputs
    let validatedInput
    try {
      validatedInput = EnrollmentSchema.parse({ classId, studentId })
    } catch (error) {
      return handleZodError(error)
    }

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('enrollStudent', validatedInput.classId)
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user.id))) {
      authLogger.warn('[enrollStudent] Rate limit exceeded', { userId: auth.user.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        class_id: validatedInput.classId,
        student_id: validatedInput.studentId,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return { success: false, error: 'Student is already enrolled' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath(`/app/teacher/classes/${validatedInput.classId}`)
    return { success: true, data }
  } catch (error) {
    authLogger.error('[enrollStudent] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function removeStudent(classId: string, studentId: string) {
  try {
    // Validate inputs
    let validatedInput
    try {
      validatedInput = EnrollmentSchema.parse({ classId, studentId })
    } catch (error) {
      return handleZodError(error)
    }

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('removeStudent', validatedInput.classId)
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user.id))) {
      authLogger.warn('[removeStudent] Rate limit exceeded', { userId: auth.user.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', validatedInput.classId)
      .eq('student_id', validatedInput.studentId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/app/teacher/classes/${validatedInput.classId}`)
    return { success: true }
  } catch (error) {
    authLogger.error('[removeStudent] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}
