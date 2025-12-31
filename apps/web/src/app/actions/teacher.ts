'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, verifyTeacherAuth, verifyClassOwnership } from '@/lib/supabase-server'
import { checkTeacherMutationRateLimit } from '@/lib/rate-limiter-distributed'
import {
  ANALYTICS_WINDOW_DAYS,
  RAPID_RESPONSE_THRESHOLD_MS,
  AT_RISK_RAPID_PERCENTAGE,
} from '@/lib/constants/analytics'
import {
  CreateClassSchema,
  UpdateClassSchema,
  EnrollmentSchema,
  ClassIdSchema,
} from '@/lib/validation-schemas'
import { authLogger } from '@/lib/auth-logger'

/**
 * Type guard to safely validate student profile structure from Supabase
 */
function isValidStudentProfile(data: unknown): data is { name: string; roll_number: string | null } {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  return typeof obj.name === 'string' && (obj.roll_number === null || typeof obj.roll_number === 'string')
}

export async function createClass(name: string, subject?: string) {
  try {
    // Validate input
    const validatedInput = CreateClassSchema.parse({ name, subject })
    name = validatedInput.name
    subject = validatedInput.subject

    // SECURITY: Verify caller is authenticated and is a teacher
    const auth = await verifyTeacherAuth('createClass')
    if (!auth.authorized) {
      return auth.error!
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user!.id))) {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        subject: subject || null,
        teacher_id: auth.user!.id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/teacher/classes')
    return { success: true, data }
  } catch (error) {
    authLogger.error('[createClass] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function updateClass(classId: string, name: string, subject?: string) {
  try {
    // Validate inputs
    const validatedInput = UpdateClassSchema.parse({ classId, name, subject })

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('updateClass', validatedInput.classId)
    if (!auth.authorized) {
      return auth.error!
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user!.id))) {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('classes')
      .update({
        name: validatedInput.name,
        subject: validatedInput.subject || null,
      })
      .eq('id', validatedInput.classId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/teacher/classes')
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[updateClass] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function deleteClass(classId: string) {
  try {
    // Validate input
    const validatedClassId = ClassIdSchema.parse(classId)

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('deleteClass', validatedClassId)
    if (!auth.authorized) {
      return auth.error!
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user!.id))) {
      authLogger.warn('[deleteClass] Rate limit exceeded', { userId: auth.user!.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', validatedClassId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/teacher/classes')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[deleteClass] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function enrollStudent(classId: string, studentId: string) {
  try {
    // Validate inputs
    const validatedInput = EnrollmentSchema.parse({ classId, studentId })

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('enrollStudent', validatedInput.classId)
    if (!auth.authorized) {
      return auth.error!
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user!.id))) {
      authLogger.warn('[enrollStudent] Rate limit exceeded', { userId: auth.user!.id })
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
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
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
    const validatedInput = EnrollmentSchema.parse({ classId, studentId })

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('removeStudent', validatedInput.classId)
    if (!auth.authorized) {
      return auth.error!
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user!.id))) {
      authLogger.warn('[removeStudent] Rate limit exceeded', { userId: auth.user!.id })
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
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[removeStudent] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Get assessment results for students in a teacher's class
 * Teachers can view aggregate and individual student results
 */
export interface StudentAssessmentResult {
  studentId: string
  studentName: string
  rollNumber: string | null
  sessionsCompleted: number
  averageScore: number | null
  lastAssessmentDate: string | null
  totalQuestions: number
  correctAnswers: number
}

export interface ClassAssessmentResults {
  classId: string
  className: string
  totalStudents: number
  studentsWithAssessments: number
  classAverageScore: number | null
  results: StudentAssessmentResult[]
}

export async function getClassAssessmentResults(classId: string): Promise<{
  success: boolean
  data?: ClassAssessmentResults
  error?: string
}> {
  try {
    // Validate input
    const validatedClassId = ClassIdSchema.parse(classId)

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('getClassAssessmentResults', validatedClassId)
    if (!auth.authorized) {
      return auth.error!
    }

    const supabase = await createClient()

    // Get all enrolled students
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        student_profiles!inner (
          name,
          roll_number
        )
      `)
      .eq('class_id', validatedClassId)

    if (enrollmentError) {
      return { success: false, error: 'Failed to fetch enrolled students' }
    }

    const studentResults: StudentAssessmentResult[] = []

    // For each enrolled student, get their assessment data
    for (const enrollment of enrollments || []) {
      // Validate student profile structure from Supabase
      if (!isValidStudentProfile(enrollment.student_profiles)) {
        authLogger.warn('[getClassAssessmentResults] Invalid student profile structure', {
          enrollment_id: enrollment.student_id
        })
        continue
      }
      const studentProfile = enrollment.student_profiles

      // Get assessment sessions for this student in this class
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('id, submitted_at')
        .eq('user_id', enrollment.student_id)
        .eq('class_id', validatedClassId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })

      const sessionsCompleted = sessions?.length || 0
      let averageScore: number | null = null
      let totalQuestions = 0
      let correctAnswers = 0
      let lastAssessmentDate: string | null = null

      if (sessions && sessions.length > 0) {
        lastAssessmentDate = sessions[0].submitted_at

        // Get all responses for these sessions
        const sessionIds = sessions.map(s => s.id)
        const { data: responses } = await supabase
          .from('assessment_responses')
          .select('is_correct')
          .in('session_id', sessionIds)

        if (responses && responses.length > 0) {
          totalQuestions = responses.length
          correctAnswers = responses.filter(r => r.is_correct).length
          // Prevent division by zero (should never happen since we check length > 0)
          if (totalQuestions > 0) {
            averageScore = Math.round((correctAnswers / totalQuestions) * 100)
          }
        }
      }

      studentResults.push({
        studentId: enrollment.student_id,
        studentName: studentProfile?.name || 'Unknown',
        rollNumber: studentProfile?.roll_number || null,
        sessionsCompleted,
        averageScore,
        lastAssessmentDate,
        totalQuestions,
        correctAnswers
      })
    }

    // Calculate class average
    const studentsWithScores = studentResults.filter(r => r.averageScore !== null)
    const classAverageScore = studentsWithScores.length > 0
      ? Math.round(studentsWithScores.reduce((sum, r) => sum + (r.averageScore || 0), 0) / studentsWithScores.length)
      : null

    // Verify classData exists before accessing it
    if (!auth.classData) {
      authLogger.error('[getClassAssessmentResults] Missing classData in auth after authorization', new Error('classData undefined'))
      return { success: false, error: 'Class data not found' }
    }

    return {
      success: true,
      data: {
        classId: validatedClassId,
        className: auth.classData.name,
        totalStudents: enrollments?.length || 0,
        studentsWithAssessments: studentsWithScores.length,
        classAverageScore,
        results: studentResults.sort((a, b) => {
          // Sort by roll number if available, otherwise by name
          if (a.rollNumber && b.rollNumber) {
            return a.rollNumber.localeCompare(b.rollNumber)
          }
          return a.studentName.localeCompare(b.studentName)
        })
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[getClassAssessmentResults] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Get all classes with assessment summary for a teacher
 */
export async function getTeacherAssessmentOverview(): Promise<{
  success: boolean
  data?: {
    classes: Array<{
      classId: string
      className: string
      subject: string | null
      studentCount: number
      assessmentsTaken: number
      averageScore: number | null
    }>
    totalAssessments: number
    overallAverageScore: number | null
  }
  error?: string
}> {
  try {
    // SECURITY: Verify caller is authenticated and is a teacher
    const auth = await verifyTeacherAuth('getTeacherAssessmentOverview')
    if (!auth.authorized) {
      return auth.error!
    }

    const supabase = await createClient()

    // Get all classes for this teacher
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, subject')
      .eq('teacher_id', auth.user!.id)
      .order('created_at', { ascending: false })

    if (classesError) {
      return { success: false, error: 'Failed to fetch classes' }
    }

    const classResults = []
    let totalAssessments = 0
    let totalScore = 0
    let scoredAssessments = 0

    for (const cls of classes || []) {
      // Get enrollment count
      const { count: studentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id)

      // Get assessment sessions for this class
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('id')
        .eq('class_id', cls.id)
        .not('submitted_at', 'is', null)

      const assessmentsTaken = sessions?.length || 0
      totalAssessments += assessmentsTaken

      // Get responses for score calculation
      let averageScore: number | null = null
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        const { data: responses } = await supabase
          .from('assessment_responses')
          .select('is_correct')
          .in('session_id', sessionIds)

        if (responses && responses.length > 0) {
          const correct = responses.filter(r => r.is_correct).length
          averageScore = Math.round((correct / responses.length) * 100)
          totalScore += averageScore
          scoredAssessments++
        }
      }

      classResults.push({
        classId: cls.id,
        className: cls.name,
        subject: cls.subject,
        studentCount: studentCount || 0,
        assessmentsTaken,
        averageScore
      })
    }

    const overallAverageScore = scoredAssessments > 0
      ? Math.round(totalScore / scoredAssessments)
      : null

    return {
      success: true,
      data: {
        classes: classResults,
        totalAssessments,
        overallAverageScore
      }
    }
  } catch (error) {
    authLogger.error('[getTeacherAssessmentOverview] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function getClassAnalytics(classId: string) {
  try {
    // Validate input
    const validatedClassId = ClassIdSchema.parse(classId)

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('getClassAnalytics', validatedClassId)
    if (!auth.authorized) {
      return auth.error!
    }

    const supabase = await createClient()

    // Use UTC for consistent timezone handling across all regions
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - ANALYTICS_WINDOW_DAYS)

    // 1. Active this week: distinct users with a session in last 7 days
    const { data: activeSessions, error: activeSessionsError } = await supabase
      .from('assessment_sessions')
      .select('user_id')
      .eq('class_id', validatedClassId)
      .gte('started_at', sevenDaysAgo.toISOString())

    if (activeSessionsError) {
      return { success: false, error: 'Failed to fetch active sessions' }
    }

    const activeThisWeek = new Set(activeSessions?.map(s => s.user_id) || []).size

    // 2. Avg minutes/day: avg(sum(rt_ms)/60000 per user) last 7 days
    const { data: userSessions, error: userSessionsError } = await supabase
      .from('assessment_sessions')
      .select('id, user_id, started_at')
      .eq('class_id', validatedClassId)
      .gte('started_at', sevenDaysAgo.toISOString())
      .not('submitted_at', 'is', null)

    if (userSessionsError) {
      return { success: false, error: 'Failed to fetch user sessions' }
    }

    let avgMinutesPerDay = 0

    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map(s => s.id)

      const { data: responses, error: responsesError } = await supabase
        .from('assessment_responses')
        .select('session_id, rt_ms')
        .in('session_id', sessionIds)

      if (responsesError) {
        return { success: false, error: 'Failed to fetch assessment responses' }
      }

      // Calculate total time per user
      const userTimes = new Map<string, number>()

      for (const session of userSessions) {
        // Filter responses that belong to this specific session's user
        const sessionResponses = responses?.filter(r =>
          r.session_id === session.id
        ) || []

        const totalMs = sessionResponses.reduce((sum, r) => sum + (r.rt_ms || 0), 0)
        const currentTime = userTimes.get(session.user_id) || 0
        userTimes.set(session.user_id, currentTime + totalMs)
      }

      const totalMinutes = Array.from(userTimes.values())
        .reduce((sum, ms) => sum + ms / 60000, 0)

      avgMinutesPerDay = userTimes.size > 0 ? totalMinutes / userTimes.size / ANALYTICS_WINDOW_DAYS : 0
    }

    // 3. At-risk: users with >30% rapid (rt_ms < 5000) items in last session
    const { data: recentSessions, error: recentSessionsError } = await supabase
      .from('assessment_sessions')
      .select('id, user_id')
      .eq('class_id', validatedClassId)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })

    if (recentSessionsError) {
      return { success: false, error: 'Failed to fetch recent sessions' }
    }

    let atRiskCount = 0

    if (recentSessions && recentSessions.length > 0) {
      // Get the most recent session per user
      const latestSessionPerUser = new Map<string, string>()
      for (const session of recentSessions) {
        if (!latestSessionPerUser.has(session.user_id)) {
          latestSessionPerUser.set(session.user_id, session.id)
        }
      }

      // Batch query: Get all responses for all latest sessions at once
      const sessionIds = Array.from(latestSessionPerUser.values())
      if (sessionIds.length > 0) {
        const { data: allSessionResponses, error: allSessionResponsesError } = await supabase
          .from('assessment_responses')
          .select('session_id, rt_ms')
          .in('session_id', sessionIds)

        if (allSessionResponsesError) {
          return { success: false, error: 'Failed to fetch session responses for at-risk analysis' }
        }

        // Group responses by session_id
        const responsesBySession = new Map<string, Array<{ rt_ms: number | null }>>()
        for (const response of allSessionResponses || []) {
          if (!responsesBySession.has(response.session_id)) {
            responsesBySession.set(response.session_id, [])
          }
          responsesBySession.get(response.session_id)!.push(response)
        }

        // Check rapid responses for each user's latest session
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
      }
    }

    return {
      success: true,
      data: {
        activeThisWeek,
        avgMinutesPerDay: Math.round(avgMinutesPerDay * 10) / 10,
        atRiskCount,
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
  'use server'

  try {
    const auth = await verifyTeacherAuth('exportStudentProgress')
    if (auth.error) {
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

    if (classData.teacher_id !== auth.user!.id) {
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
    const exportData = (students || []).map(enrollment => {
      const profile = enrollment.student as any
      const state = Array.isArray(enrollment.student_knowledge_state)
        ? enrollment.student_knowledge_state[0]
        : enrollment.student_knowledge_state

      return {
        name: profile?.raw_user_meta_data?.full_name || 'Unknown',
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
  'use server'

  try {
    const auth = await verifyTeacherAuth('exportAIInteractions')
    if (auth.error) {
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

    if (classData.teacher_id !== auth.user!.id) {
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
    const exportData = (interactions || []).map(interaction => {
      const student = interaction.student as any
      return {
        student_name: student?.raw_user_meta_data?.full_name || 'Unknown',
        topic_id: interaction.topic_id || '',
        message: (interaction as any).message_content || '',
        role: (interaction as any).message_role || 'user',
        language: interaction.language || 'en',
        input_mode: (interaction as any).input_mode || 'text',
        created_at: interaction.created_at || '',
        tokens_used: (interaction as any).tokens_used || 0,
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
