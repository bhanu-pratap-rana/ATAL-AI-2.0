/**
 * Centralized Validation Schemas
 *
 * All Zod validation schemas used across server actions.
 * Prevents duplicate schema definitions and ensures consistency.
 *
 * Rule.md Compliance:
 * - Single source of truth for validation schemas
 * - Uses constants from validation-limits.ts
 * - Type-safe and reusable
 */

import { z } from 'zod'
import {
  PROFILE_LIMITS,
  SCHOOL_LIMITS,
  ASSESSMENT_LIMITS,
  PIN_LIMITS,
} from '@/lib/constants/validation-limits'

// ============================================================================
// Student Schemas
// ============================================================================

/**
 * Schema for joining a class with code and PIN
 */
export const JoinClassSchema = z.object({
  classCode: z
    .string()
    .min(1, 'Class code required')
    .max(SCHOOL_LIMITS.schoolCodeMaxLength, 'Invalid class code')
    .regex(/^[A-Z0-9\-]+$/, 'Class code format invalid'),
  pin: z
    .string()
    .length(PIN_LIMITS.length, `PIN must be ${PIN_LIMITS.length} digits`)
    .regex(/^\d{4}$/, 'PIN must contain only digits'),
})

/**
 * Schema for student profile data
 */
export const StudentProfileSchema = z.object({
  name: z
    .string()
    .min(PROFILE_LIMITS.nameMinLength, `Name must be at least ${PROFILE_LIMITS.nameMinLength} characters`)
    .max(PROFILE_LIMITS.nameMaxLength, 'Name too long'),
  gender: z.enum(['male', 'female']),
  phone: z.string().optional(),
  rollNumber: z.string().max(PROFILE_LIMITS.rollNumberMaxLength).optional(),
  schoolName: z.string().optional(),
  className: z.string().max(SCHOOL_LIMITS.classNameMaxLength).optional(),
  village: z.string().optional(),
})

// ============================================================================
// Teacher Schemas
// ============================================================================

/**
 * Schema for creating a class
 */
export const CreateClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required')
    .max(SCHOOL_LIMITS.classNameMaxLength, `Class name must be ${SCHOOL_LIMITS.classNameMaxLength} characters or less`),
  subject: z
    .string()
    .max(SCHOOL_LIMITS.subjectMaxLength, `Subject must be ${SCHOOL_LIMITS.subjectMaxLength} characters or less`)
    .optional(),
})

// ============================================================================
// School Schemas
// ============================================================================

/**
 * Schema for school search query
 */
export const SearchQuerySchema = z
  .string()
  .min(1, 'Search query required')
  .max(SCHOOL_LIMITS.searchQueryMaxLength, 'Search query too long')
  .regex(/^[a-zA-Z0-9\s\-.']+$/, 'Search query contains invalid characters')

/**
 * Schema for school code
 */
export const SchoolCodeSchema = z
  .string()
  .min(1, 'School code required')
  .max(SCHOOL_LIMITS.schoolCodeMaxLength, 'Invalid school code format')

/**
 * Schema for staff PIN (4-8 digits)
 */
export const StaffPinSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'PIN must be 4-8 digits')

/**
 * Schema for teacher name
 */
export const TeacherNameSchema = z
  .string()
  .min(1, 'Name required')
  .max(PROFILE_LIMITS.nameMaxLength, 'Name too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')

/**
 * Schema for phone number (optional)
 */
export const PhoneSchema = z
  .string()
  .regex(/^\+?[0-9\-\s()]{10,}$/, 'Invalid phone number format')
  .optional()

// ============================================================================
// Assessment Schemas
// ============================================================================

/**
 * Schema for a single assessment response
 */
export const AssessmentResponseSchema = z.object({
  itemId: z
    .string()
    .min(1, 'Item ID required')
    .max(ASSESSMENT_LIMITS.itemIdMaxLength, 'Item ID too long'),
  module: z
    .string()
    .min(1, 'Module required')
    .max(ASSESSMENT_LIMITS.moduleNameMaxLength, 'Module name too long'),
  isCorrect: z.boolean(),
  rtMs: z
    .number()
    .min(0, 'Response time cannot be negative')
    .max(999999, 'Response time too long'),
  focusBlurCount: z
    .number()
    .min(0, 'Focus blur count cannot be negative')
    .max(ASSESSMENT_LIMITS.focusBlurCountMax, 'Focus blur count too high'),
  chosenOption: z
    .string()
    .min(1, 'Chosen option required')
    .max(ASSESSMENT_LIMITS.optionIdMaxLength, 'Option ID too long'),
})

/**
 * Schema for submitting assessment responses
 */
export const AssessmentSubmitSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required').uuid(),
  responses: z
    .array(AssessmentResponseSchema)
    .min(1, 'At least one response required')
    .max(ASSESSMENT_LIMITS.responsesMaxCount, 'Too many responses'),
})

// ============================================================================
// Type Exports
// ============================================================================

export type JoinClassInput = z.infer<typeof JoinClassSchema>
export type StudentProfileInput = z.infer<typeof StudentProfileSchema>
export type CreateClassInput = z.infer<typeof CreateClassSchema>
export type AssessmentResponseInput = z.infer<typeof AssessmentResponseSchema>
export type AssessmentSubmitInput = z.infer<typeof AssessmentSubmitSchema>
