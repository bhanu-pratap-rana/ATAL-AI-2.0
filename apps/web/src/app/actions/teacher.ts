'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getCurrentUser } from '@/lib/supabase-server'
import {
  ANALYTICS_WINDOW_DAYS,
  RAPID_RESPONSE_THRESHOLD_MS,
  AT_RISK_RAPID_PERCENTAGE,
} from '@/lib/constants/analytics'
import { CreateClassSchema } from '@/lib/validation-schemas'

export async function createClass(name: string, subject?: string) {
  try {
    // Validate input
    const validatedInput = CreateClassSchema.parse({ name, subject })
    name = validatedInput.name
    subject = validatedInput.subject

    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify user is a teacher (teacher_profiles uses user_id as primary key, not id)
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: teacherProfile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      return { success: false, error: 'Failed to verify teacher status' }
    }

    if (!teacherProfile) {
      return { success: false, error: 'Only teachers can create classes' }
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        subject: subject || null,
        teacher_id: user.id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/teacher/classes')
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function updateClass(classId: string, name: string, subject?: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify user is a teacher (teacher_profiles uses user_id as primary key, not id)
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: teacherProfile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      return { success: false, error: 'Failed to verify teacher status' }
    }

    if (!teacherProfile) {
      return { success: false, error: 'Only teachers can update classes' }
    }

    // Verify the teacher owns this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return { success: false, error: 'Failed to verify class ownership' }
    }

    if (!classData || classData.teacher_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('classes')
      .update({
        name,
        subject: subject || null,
      })
      .eq('id', classId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/teacher/classes')
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function deleteClass(classId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify user is a teacher (teacher_profiles uses user_id as primary key, not id)
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: teacherProfile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      return { success: false, error: 'Failed to verify teacher status' }
    }

    if (!teacherProfile) {
      return { success: false, error: 'Only teachers can delete classes' }
    }

    // Verify the teacher owns this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return { success: false, error: 'Failed to verify class ownership' }
    }

    if (!classData || classData.teacher_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/teacher/classes')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function enrollStudent(classId: string, studentId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify the teacher owns this class
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return { success: false, error: 'Failed to verify class ownership' }
    }

    if (!classData || classData.teacher_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        class_id: classId,
        student_id: studentId,
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

    revalidatePath(`/app/teacher/classes/${classId}`)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function removeStudent(classId: string, studentId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify the teacher owns this class
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return { success: false, error: 'Failed to verify class ownership' }
    }

    if (!classData || classData.teacher_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/app/teacher/classes/${classId}`)
    return { success: true }
  } catch (error) {
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
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify the teacher owns this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return { success: false, error: 'Failed to verify class ownership' }
    }

    if (!classData || classData.teacher_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
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
      .eq('class_id', classId)

    if (enrollmentError) {
      return { success: false, error: 'Failed to fetch enrolled students' }
    }

    const studentResults: StudentAssessmentResult[] = []

    // For each enrolled student, get their assessment data
    for (const enrollment of enrollments || []) {
      // Supabase returns the joined record as an object when using !inner
      const studentProfile = enrollment.student_profiles as unknown as { name: string; roll_number: string | null }

      // Get assessment sessions for this student in this class
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('id, submitted_at')
        .eq('user_id', enrollment.student_id)
        .eq('class_id', classId)
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
          averageScore = Math.round((correctAnswers / totalQuestions) * 100)
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

    return {
      success: true,
      data: {
        classId,
        className: classData.name,
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
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Get all classes for this teacher
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, subject')
      .eq('teacher_id', user.id)
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function getClassAnalytics(classId: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Verify the teacher owns this class
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return { success: false, error: 'Failed to verify class ownership' }
    }

    if (!classData || classData.teacher_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Use UTC for consistent timezone handling across all regions
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - ANALYTICS_WINDOW_DAYS)

    // 1. Active this week: distinct users with a session in last 7 days
    const { data: activeSessions, error: activeSessionsError } = await supabase
      .from('assessment_sessions')
      .select('user_id')
      .eq('class_id', classId)
      .gte('started_at', sevenDaysAgo.toISOString())

    if (activeSessionsError) {
      return { success: false, error: 'Failed to fetch active sessions' }
    }

    const activeThisWeek = new Set(activeSessions?.map(s => s.user_id) || []).size

    // 2. Avg minutes/day: avg(sum(rt_ms)/60000 per user) last 7 days
    const { data: userSessions, error: userSessionsError } = await supabase
      .from('assessment_sessions')
      .select('id, user_id, started_at')
      .eq('class_id', classId)
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
      .eq('class_id', classId)
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}
