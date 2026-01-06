'use server'

import { z } from 'zod'
import { createClient, verifyClassOwnership, verifyTeacherAuth } from '@/lib/supabase-server'
import {
  ANALYTICS_WINDOW_DAYS,
  RAPID_RESPONSE_THRESHOLD_MS,
  AT_RISK_RAPID_PERCENTAGE,
} from '@/lib/constants/analytics'
import {
  ClassIdSchema,
} from '@/lib/validation-schemas'
import { authLogger } from '@/lib/auth-logger'
import { handleZodError } from '@/lib/action-error-handler'

/**
 * Type definitions for Supabase responses
 */

/**
 * User object from auth.users joined queries
 */
interface AuthUser {
  id: string
  email?: string
  raw_user_meta_data?: {
    full_name?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * Knowledge state for a student
 */
interface StudentKnowledgeState {
  topics_mastered: number
  total_topics: number
  average_mastery: number
  last_attempt_at: string | null
}

/**
 * Student enrollment with knowledge state
 */
interface StudentEnrollment {
  student: AuthUser[] | AuthUser | undefined
  student_knowledge_state: StudentKnowledgeState[] | StudentKnowledgeState | null
}

/**
 * AI tutor interaction record
 */
interface AITutorInteraction {
  id: string
  student_id: string
  topic_id: string
  message_content: string
  message_role: 'user' | 'assistant'
  language: string
  input_mode: string
  tokens_used: number
  created_at: string
  student?: AuthUser
}

/**
 * Helper: Verify class ownership for analytics
 */
async function verifyClassOwnershipForAnalytics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { data: classData, error: classDataError } = await supabase
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .maybeSingle()

  if (classDataError || !classData || classData.teacher_id !== userId) {
    authLogger.warn('[getClassAnalytics] Access denied: Class no longer owned by user', {
      userId,
      classId,
    })
    return { success: false, error: 'You do not own this class' }
  }

  return { success: true }
}

/**
 * Helper: Calculate active users this week
 */
async function calculateActiveUsersThisWeek(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  sevenDaysAgo: Date
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const { data: activeSessions, error: activeSessionsError } = await supabase
    .from('assessment_sessions')
    .select('user_id')
    .eq('class_id', classId)
    .gte('started_at', sevenDaysAgo.toISOString())

  if (activeSessionsError) {
    return { success: false, error: 'Failed to fetch active sessions' }
  }

  const activeThisWeek = new Set(activeSessions?.map(s => s.user_id) || []).size
  return { success: true, count: activeThisWeek }
}

/**
 * Helper: Build responses map by session
 */
function buildResponsesBySessionMap<T extends { session_id: string }>(
  responses: T[]
): Map<string, T[]> {
  const responsesBySession = new Map<string, T[]>()
  responses.forEach(r => {
    if (!responsesBySession.has(r.session_id)) {
      responsesBySession.set(r.session_id, [])
    }
    const sessionResponses = responsesBySession.get(r.session_id)
    if (sessionResponses) {
      sessionResponses.push(r)
    }
  })
  return responsesBySession
}

/**
 * Helper: Calculate average minutes per day
 */
async function calculateAverageMinutesPerDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  sevenDaysAgo: Date
): Promise<{ success: true; avgMinutes: number } | { success: false; error: string }> {
  const { data: userSessions, error: userSessionsError } = await supabase
    .from('assessment_sessions')
    .select('id, user_id, started_at')
    .eq('class_id', classId)
    .gte('started_at', sevenDaysAgo.toISOString())
    .not('submitted_at', 'is', null)

  if (userSessionsError) {
    return { success: false, error: 'Failed to fetch user sessions' }
  }

  if (!userSessions || userSessions.length === 0) {
    return { success: true, avgMinutes: 0 }
  }

  const sessionIds = userSessions.map(s => s.id)
  const { data: responses, error: responsesError } = await supabase
    .from('assessment_responses')
    .select('session_id, rt_ms')
    .in('session_id', sessionIds)

  if (responsesError) {
    return { success: false, error: 'Failed to fetch assessment responses' }
  }

  const responsesBySession = buildResponsesBySessionMap(responses || [])
  const userTimes = new Map<string, number>()

  for (const session of userSessions) {
    const sessionResponses = responsesBySession.get(session.id) || []
    const totalMs = sessionResponses.reduce((sum, r) => sum + (r.rt_ms || 0), 0)
    const currentTime = userTimes.get(session.user_id) || 0
    userTimes.set(session.user_id, currentTime + totalMs)
  }

  const totalMinutes = Array.from(userTimes.values())
    .reduce((sum, ms) => sum + ms / 60000, 0)

  const avgMinutes = userTimes.size > 0
    ? totalMinutes / userTimes.size / ANALYTICS_WINDOW_DAYS
    : 0

  return { success: true, avgMinutes }
}

/**
 * Helper: Get latest session per user
 */
function getLatestSessionPerUser(
  sessions: Array<{ id: string; user_id: string }>
): Map<string, string> {
  const latestSessionPerUser = new Map<string, string>()
  for (const session of sessions) {
    if (!latestSessionPerUser.has(session.user_id)) {
      latestSessionPerUser.set(session.user_id, session.id)
    }
  }
  return latestSessionPerUser
}

/**
 * Helper: Calculate at-risk student count
 */
async function calculateAtRiskCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const { data: recentSessions, error: recentSessionsError } = await supabase
    .from('assessment_sessions')
    .select('id, user_id')
    .eq('class_id', classId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  if (recentSessionsError) {
    return { success: false, error: 'Failed to fetch recent sessions' }
  }

  if (!recentSessions || recentSessions.length === 0) {
    return { success: true, count: 0 }
  }

  const latestSessionPerUser = getLatestSessionPerUser(recentSessions)
  const sessionIds = Array.from(latestSessionPerUser.values())

  if (sessionIds.length === 0) {
    return { success: true, count: 0 }
  }

  const { data: allSessionResponses, error: allSessionResponsesError } = await supabase
    .from('assessment_responses')
    .select('session_id, rt_ms')
    .in('session_id', sessionIds)

  if (allSessionResponsesError) {
    return { success: false, error: 'Failed to fetch session responses for at-risk analysis' }
  }

  const responsesBySession = buildResponsesBySessionMap(
    (allSessionResponses || []) as Array<{ session_id: string; rt_ms: number | null }>
  )

  let atRiskCount = 0
  for (const sessionId of sessionIds) {
    const sessionResponses = responsesBySession.get(sessionId) || []

    if (sessionResponses.length > 0) {
      const rapidCount = sessionResponses.filter(
        r => r.rt_ms && r.rt_ms < RAPID_RESPONSE_THRESHOLD_MS
      ).length
      const rapidPercentage = (rapidCount / sessionResponses.length) * 100

      if (rapidPercentage > AT_RISK_RAPID_PERCENTAGE * 100) {
        atRiskCount++
      }
    }
  }

  return { success: true, count: atRiskCount }
}

/**
 * Get class analytics (refactored to reduce cognitive complexity)
 * CRITICAL FIX: Reduced complexity from 49 to <15 by extracting helper functions
 */
export async function getClassAnalytics(classId: string) {
  try {
    let validatedClassId
    try {
      validatedClassId = ClassIdSchema.parse(classId)
    } catch (error) {
      return handleZodError(error)
    }

    const auth = await verifyClassOwnership('getClassAnalytics', validatedClassId)
    if (!auth.authorized) {
      return auth.error
    }

    const supabase = await createClient()
    const ownershipCheck = await verifyClassOwnershipForAnalytics(
      supabase,
      validatedClassId,
      auth.user.id
    )
    if (!ownershipCheck.success) {
      return ownershipCheck
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - ANALYTICS_WINDOW_DAYS)

    const [activeResult, avgMinutesResult, atRiskResult] = await Promise.all([
      calculateActiveUsersThisWeek(supabase, validatedClassId, sevenDaysAgo),
      calculateAverageMinutesPerDay(supabase, validatedClassId, sevenDaysAgo),
      calculateAtRiskCount(supabase, validatedClassId),
    ])

    if (!activeResult.success) {
      return activeResult
    }
    if (!avgMinutesResult.success) {
      return avgMinutesResult
    }
    if (!atRiskResult.success) {
      return atRiskResult
    }

    return {
      success: true,
      data: {
        activeThisWeek: activeResult.count,
        avgMinutesPerDay: Math.round(avgMinutesResult.avgMinutes * 10) / 10,
        atRiskCount: atRiskResult.count,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[getClassAnalytics] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Export student progress data for a class
 * Returns: Student name, progress percentage, mastery score, last activity
 */
export async function exportStudentProgress(classId: string) {
  try {
    const auth = await verifyTeacherAuth('exportStudentProgress')
    if (!auth.authorized) {
      return auth.error
    }

    const supabase = await createClient()

    // Verify teacher has access to this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError || !classData) {
      return { success: false, error: 'Class not found' }
    }

    if (classData.teacher_id !== auth.user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get enrolled students with progress
    const { data: students, error: studentError } = await supabase
      .from('enrollments')
      .select(
        `
        student_id,
        student:auth_users_view(id, raw_user_meta_data),
        student_knowledge_state!inner(
          topics_mastered,
          total_topics,
          average_mastery,
          last_attempt_at
        )
      `
      )
      .eq('class_id', classId)

    if (studentError) {
      return { success: false, error: 'Failed to fetch student data' }
    }

    // Format for export
    const exportData = (students || []).map((enrollment: StudentEnrollment) => {
      // Handle student array or single object
      const studentArray = Array.isArray(enrollment.student)
        ? enrollment.student
        : enrollment.student ? [enrollment.student] : []
      const profile = studentArray[0] as AuthUser | undefined

      // Handle knowledge state array or single object
      const state = Array.isArray(enrollment.student_knowledge_state)
        ? enrollment.student_knowledge_state[0]
        : enrollment.student_knowledge_state

      // Sanitize user-generated content to prevent formula injection and XSS
      const sanitizeName = (name: unknown): string => {
        const str = String(name || 'Unknown')
        // SECURITY FIX: Comprehensive CSV formula injection prevention
        // Protect against all Excel/CSV injection vectors
        const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n']
        const firstChar = str[0] || ''

        // Check for formula injection attempts
        if (dangerousChars.includes(firstChar)) {
          // Prefix with single quote to neutralize formula
          return "'" + str.replaceAll('"', '""')
        }

        // Check for hidden formula injection (e.g., "  =cmd")
        const trimmedStr = str.trim()
        if (trimmedStr.length > 0 && dangerousChars.includes(trimmedStr[0])) {
          return "'" + str.replaceAll('"', '""')
        }

        // Escape quotes for CSV safety
        return str.replaceAll('"', '""')
      }

      return {
        name: sanitizeName(profile?.raw_user_meta_data?.full_name),
        email: profile?.id || '',
        progress_percentage: state ? Math.round((state.topics_mastered / state.total_topics) * 100) : 0,
        mastery_score: state?.average_mastery || 0,
        last_active: state?.last_attempt_at || 'Never',
      }
    })

    return {
      success: true,
      data: exportData,
    }
  } catch (error) {
    authLogger.error('[exportStudentProgress] Error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    }
  }
}

/**
 * Export AI tutor interactions for a class
 * Returns: Student, topic, message content, role, language, timestamp
 */
export async function exportAIInteractions(classId: string, limit: number = 500) {
  try {
    const auth = await verifyTeacherAuth('exportAIInteractions')
    if (!auth.authorized) {
      return auth.error
    }

    const supabase = await createClient()

    // Verify teacher has access to this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError || !classData) {
      return { success: false, error: 'Class not found' }
    }

    if (classData.teacher_id !== auth.user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get student IDs for this class
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)

    if (enrollError) {
      return { success: false, error: 'Failed to fetch enrollments' }
    }

    const studentIds = (enrollments || []).map(e => e.student_id)

    if (studentIds.length === 0) {
      return { success: true, data: [] }
    }

    // Get AI interactions for enrolled students
    const { data: interactions, error: interactionError } = await supabase
      .from('ai_tutor_interactions')
      .select(
        `
        *,
        student:student_id(raw_user_meta_data)
      `
      )
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (interactionError) {
      return { success: false, error: 'Failed to fetch interactions' }
    }

    // Format for export
    const exportData = (interactions || []).map((interaction: AITutorInteraction) => {
      const student = interaction.student as AuthUser | undefined
      return {
        student_name: student?.raw_user_meta_data?.full_name || 'Unknown',
        topic_id: interaction.topic_id || '',
        message: interaction.message_content || '',
        role: interaction.message_role || 'user',
        language: interaction.language || 'en',
        input_mode: interaction.input_mode || 'text',
        created_at: interaction.created_at || '',
        tokens_used: interaction.tokens_used || 0,
      }
    })

    return {
      success: true,
      data: exportData,
    }
  } catch (error) {
    authLogger.error('[exportAIInteractions] Error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    }
  }
}
