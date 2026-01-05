'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, verifyTeacherAuth, verifyClassOwnership } from '@/lib/supabase-server'
import { checkTeacherMutationRateLimit } from '@/lib/rate-limiter-distributed'
import { queryCache } from '@/lib/cache/query-cache'
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
import { handleZodError } from '@/lib/action-error-handler'

/**
 * Type definitions for Supabase responses
 *
 * Note: Some interfaces include `[key: string]: unknown` to allow for additional fields
 * from Supabase responses. This is necessary because:
 * 1. Supabase may include extra metadata fields depending on the select() clause
 * 2. User-defined custom fields may be present in raw_user_meta_data
 * 3. Future schema extensions may add new fields
 *
 * When accessing these interfaces, always validate known required fields first.
 */

/**
 * User object from auth.users joined queries
 *
 * Guaranteed fields: id
 * Optional fields: email, raw_user_meta_data
 * Note: Not all fields are always available depending on the select clause used
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
 *
 * Guaranteed fields: topics_mastered, total_topics, average_mastery, last_attempt_at
 * These fields represent computed student learning metrics
 */
interface StudentKnowledgeState {
  topics_mastered: number
  total_topics: number
  average_mastery: number
  last_attempt_at: string | null
}

/**
 * Student enrollment with knowledge state
 *
 * Note: Supabase joins return arrays when using nested select with multiple rows
 * Fields may contain single objects or arrays depending on the query results
 */
interface StudentEnrollment {
  student: AuthUser[] | AuthUser | undefined
  student_knowledge_state: StudentKnowledgeState[] | StudentKnowledgeState | null
}

/**
 * AI tutor interaction record
 *
 * Guaranteed fields: id, student_id, topic_id, message_content, message_role, language, input_mode, tokens_used, created_at
 * Optional fields: student (populated if using select with join)
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
    let validatedInput
    try {
      validatedInput = CreateClassSchema.parse({ name, subject })
    } catch (error) {
      return handleZodError(error)
    }
    name = validatedInput.name
    subject = validatedInput.subject

    // SECURITY: Verify caller is authenticated and is a teacher
    const auth = await verifyTeacherAuth('createClass')
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user.id))) {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        subject: subject || null,
        teacher_id: auth.user.id,
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
    let validatedInput
    try {
      validatedInput = UpdateClassSchema.parse({ classId, name, subject })
    } catch (error) {
      return handleZodError(error)
    }

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('updateClass', validatedInput.classId)
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user.id))) {
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
    let validatedClassId
    try {
      validatedClassId = ClassIdSchema.parse(classId)
    } catch (error) {
      return handleZodError(error)
    }

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('deleteClass', validatedClassId)
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    if (!(await checkTeacherMutationRateLimit(auth.user.id))) {
      authLogger.warn('[deleteClass] Rate limit exceeded', { userId: auth.user.id })
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

/**
 * Helper: Build lookup maps for sessions and responses
 */
function buildLookupMaps(
  allSessions: Array<{ id: string; user_id: string; submitted_at: string }> | null,
  allResponses: Array<{ session_id: string; is_correct: boolean }> | null
): {
  sessionsByStudent: Map<string, Array<{ id: string; submitted_at: string }>>
  responsesBySession: Map<string, Array<{ is_correct: boolean }>>
} {
  const sessionsByStudent = new Map<string, Array<{ id: string; submitted_at: string }>>()
  const responsesBySession = new Map<string, Array<{ is_correct: boolean }>>()

  allSessions?.forEach(session => {
    if (!sessionsByStudent.has(session.user_id)) {
      sessionsByStudent.set(session.user_id, [])
    }
    const studentSessions = sessionsByStudent.get(session.user_id)
    if (studentSessions) {
      studentSessions.push({
        id: session.id,
        submitted_at: session.submitted_at
      })
    }
  })

  allResponses?.forEach(response => {
    if (!responsesBySession.has(response.session_id)) {
      responsesBySession.set(response.session_id, [])
    }
    const sessionResponses = responsesBySession.get(response.session_id)
    if (sessionResponses) {
      sessionResponses.push({
        is_correct: response.is_correct
      })
    }
  })

  return { sessionsByStudent, responsesBySession }
}

/**
 * Helper: Calculate student assessment statistics
 */
function calculateStudentStats(
  sessions: Array<{ id: string; submitted_at: string }>,
  responsesBySession: Map<string, Array<{ is_correct: boolean }>>
): {
  sessionsCompleted: number
  averageScore: number | null
  lastAssessmentDate: string | null
  totalQuestions: number
  correctAnswers: number
} {
  const sessionsCompleted = sessions.length

  if (sessions.length === 0) {
    return { sessionsCompleted: 0, averageScore: null, lastAssessmentDate: null, totalQuestions: 0, correctAnswers: 0 }
  }

  sessions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
  const lastAssessmentDate = sessions[0].submitted_at

  let totalQuestions = 0
  let correctAnswers = 0

  for (const session of sessions) {
    const responses = responsesBySession.get(session.id) || []
    totalQuestions += responses.length
    correctAnswers += responses.filter(r => r.is_correct).length
  }

  const averageScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null

  return { sessionsCompleted, averageScore, lastAssessmentDate, totalQuestions, correctAnswers }
}

/**
 * Helper: Process student results from enrollments
 */
function processStudentResults(
  enrollments: Array<{
    student_id: string
    student_profiles: { name: string; roll_number: string | null } | null
  }> | null,
  sessionsByStudent: Map<string, Array<{ id: string; submitted_at: string }>>,
  responsesBySession: Map<string, Array<{ is_correct: boolean }>>
): StudentAssessmentResult[] {
  const studentResults: StudentAssessmentResult[] = []

  for (const enrollment of enrollments || []) {
    if (!isValidStudentProfile(enrollment.student_profiles)) {
      authLogger.warn('[getClassAssessmentResults] Invalid student profile structure', {
        enrollment_id: enrollment.student_id
      })
      continue
    }

    // isValidStudentProfile already ensures student_profiles is not null
    const studentProfile = enrollment.student_profiles
    const sessions = sessionsByStudent.get(enrollment.student_id) || []
    const stats = calculateStudentStats(sessions, responsesBySession)

    studentResults.push({
      studentId: enrollment.student_id,
      studentName: studentProfile.name,
      rollNumber: studentProfile.roll_number || null,
      sessionsCompleted: stats.sessionsCompleted,
      averageScore: stats.averageScore,
      lastAssessmentDate: stats.lastAssessmentDate,
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers
    })
  }

  return studentResults
}

/**
 * Get class assessment results (refactored to reduce cognitive complexity)
 * CRITICAL FIX: Reduced complexity from 21 to <15 by extracting helper functions
 */
export async function getClassAssessmentResults(classId: string): Promise<{
  success: boolean
  data?: ClassAssessmentResults
  error?: string
}> {
  try {
    // Validate input
    let validatedClassId
    try {
      validatedClassId = ClassIdSchema.parse(classId)
    } catch (error) {
      const zodError = handleZodError(error)
      return { success: zodError.success, error: zodError.error }
    }

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership('getClassAssessmentResults', validatedClassId)
    if (!auth.authorized) {
      return auth.error
    }

    const supabase = await createClient()

    // SECURITY FIX #4 EXTENSION: Re-verify class ownership before analytics queries
    // Prevents TOCTOU vulnerability if class is deleted/transferred after initial check
    const { data: classData, error: classDataError } = await supabase
      .from('classes')
      .select('id, teacher_id, name')
      .eq('id', validatedClassId)
      .maybeSingle()

    if (classDataError || !classData || classData.teacher_id !== auth.user.id) {
      authLogger.warn('[getClassAssessmentResults] Access denied: Class no longer owned by user', {
        userId: auth.user.id,
        classId: validatedClassId,
      })
      return { success: false, error: 'You do not own this class' }
    }

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

    // OPTIMIZATION: Batch fetch all assessment data instead of looping (prevents N+1 queries)
    const studentIds = (enrollments || []).map(e => e.student_id)

    // Get all assessment sessions for all students in this class in one query
    const { data: allSessions } = await supabase
      .from('assessment_sessions')
      .select('id, user_id, submitted_at')
      .in('user_id', studentIds)
      .eq('class_id', validatedClassId)
      .not('submitted_at', 'is', null)

    // Get all assessment session IDs for bulk response fetch
    const sessionIds = allSessions?.map(s => s.id) || []

    // Get all responses for all sessions in one query (instead of per-student queries)
    const { data: allResponses } = await supabase
      .from('assessment_responses')
      .select('is_correct, session_id')
      .in('session_id', sessionIds)

    const { sessionsByStudent, responsesBySession } = buildLookupMaps(
      allSessions,
      allResponses
    )

    const studentResults = processStudentResults(
      enrollments as unknown as Array<{ student_id: string; student_profiles: { name: string; roll_number: string | null } | null }>,
      sessionsByStudent,
      responsesBySession
    )

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
/**
 * Internal function to fetch teacher assessment overview from database
 * This is wrapped by getTeacherAssessmentOverview() with query caching
 */
async function fetchTeacherAssessmentOverviewFromDB(teacherId: string): Promise<{
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
}> {
  const supabase = await createClient()

  // Get all classes for this teacher
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name, subject')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (classesError) {
    throw classesError
  }

  const classResults = []
  let totalAssessments = 0
  let totalScore = 0
  let scoredAssessments = 0

  // OPTIMIZATION: Batch fetch all data for all classes (prevents N+1 queries)
  const classIds = (classes || []).map(c => c.id)

  // Get enrollment counts for all classes in one query
  const { data: allEnrollments } = await supabase
    .from('enrollments')
    .select('class_id')
    .in('class_id', classIds)

  // Get all assessment sessions for all classes in one query
  const { data: allSessions } = await supabase
    .from('assessment_sessions')
    .select('id, class_id')
    .in('class_id', classIds)
    .not('submitted_at', 'is', null)

  // Get all responses for all sessions in one query
  const sessionIds = allSessions?.map(s => s.id) || []
  const { data: allResponses } = await supabase
    .from('assessment_responses')
    .select('is_correct, session_id')
    .in('session_id', sessionIds)

  // Build lookup maps for efficient data association
  const enrollmentCountByClass = new Map<string, number>()
  const sessionsByClass = new Map<string, string[]>()
  const responseCountBySession = new Map<string, { correct: number; total: number }>()

  // Count enrollments by class
  allEnrollments?.forEach(enrollment => {
    const count = (enrollmentCountByClass.get(enrollment.class_id) || 0) + 1
    enrollmentCountByClass.set(enrollment.class_id, count)
  })

  // Index sessions by class_id
  allSessions?.forEach(session => {
    if (!sessionsByClass.has(session.class_id)) {
      sessionsByClass.set(session.class_id, [])
    }
    const classSessions = sessionsByClass.get(session.class_id)
    if (classSessions) {
      classSessions.push(session.id)
    }
  })

  // Count responses per session (both correct and total) in single pass
  allResponses?.forEach(response => {
    const current = responseCountBySession.get(response.session_id) || { correct: 0, total: 0 }
    current.total += 1
    if (response.is_correct) {
      current.correct += 1
    }
    responseCountBySession.set(response.session_id, current)
  })

  // Process class results using pre-fetched data (no queries in loop)
  for (const cls of classes || []) {
    const studentCount = enrollmentCountByClass.get(cls.id) || 0
    const sessions = sessionsByClass.get(cls.id) || []
    const assessmentsTaken = sessions.length
    totalAssessments += assessmentsTaken

    // Calculate average score from pre-fetched responses
    let averageScore: number | null = null
    if (sessions.length > 0) {
      let totalCorrect = 0
      let totalQuestions = 0

      for (const sessionId of sessions) {
        const counts = responseCountBySession.get(sessionId)
        if (counts) {
          totalCorrect += counts.correct
          totalQuestions += counts.total
        }
      }

      if (totalQuestions > 0) {
        averageScore = Math.round((totalCorrect / totalQuestions) * 100)
        totalScore += averageScore
        scoredAssessments++
      }
    }

    classResults.push({
      classId: cls.id,
      className: cls.name,
      subject: cls.subject,
      studentCount,
      assessmentsTaken,
      averageScore
    })
  }

  const overallAverageScore = scoredAssessments > 0
    ? Math.round(totalScore / scoredAssessments)
    : null

  return {
    classes: classResults,
    totalAssessments,
    overallAverageScore
  }
}

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
      return auth.error
    }

    // PERFORMANCE: Use query cache - 3 minute TTL for teacher dashboard
    // Teacher dashboards change more frequently than admin, so shorter TTL
    const data = await queryCache.getOrFetch(
      `teacher:${auth.user.id}:assessment:overview`,
      () => fetchTeacherAssessmentOverviewFromDB(auth.user.id),
      3 * 60 * 1000 // 3 minutes
    )

    return {
      success: true,
      data
    }
  } catch (error) {
    authLogger.error('[getTeacherAssessmentOverview] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
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
