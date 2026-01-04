'use server'

import { createClient, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit } from '@/lib/rate-limiter-distributed'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import { isTeacherOrHigher } from '@/lib/auth/role-utils'

/**
 * Dashboard statistics for students and teachers
 * All data is real, fetched from the database
 */

export interface DashboardStats {
  classesCount: number
  assessmentsCount: number
  averageScore: number | null
  streakDays: number
  recentActivity: RecentActivity[]
}

export interface RecentActivity {
  id: string
  type: 'assessment' | 'class_join' | 'achievement'
  title: string
  description: string
  timestamp: string
  score?: number
}

export interface ProgressStats {
  coursesCompleted: number
  assessmentsTaken: number
  averageScore: number | null
  totalTimeSpent: number // in minutes
  moduleBreakdown: ModuleProgress[]
  recentAssessments: AssessmentResult[]
}

export interface ModuleProgress {
  module: string
  questionsAttempted: number
  correctAnswers: number
  averageScore: number
}

export interface AssessmentResult {
  id: string
  completedAt: string
  score: number
  totalQuestions: number
  timeSpent: number // in seconds
}

/**
 * Get dashboard stats for the current user
 * Returns real data from database with proper empty states
 */
export async function getDashboardStats(): Promise<{
  success: boolean
  data?: DashboardStats
  error?: string
}> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // SECURITY: Verify user has an authorized role (student, teacher, or admin)
    const role = user.app_metadata?.role
    const isTeacher = isTeacherOrHigher(role)
    const isStudent = role === 'student' || role === undefined // Default to student if no explicit role

    if (!isTeacher && !isStudent) {
      authLogger.warn('[getDashboardStats] Unauthorized role attempted to access dashboard', {
        userId: user.id,
        role,
      })
      return { success: false, error: 'Unauthorized' }
    }

    // SECURITY: Rate limit dashboard stats to prevent abuse
    const rateLimitKey = `dashboard-stats:${user.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.dashboardStats)
    if (!isAllowed) {
      authLogger.warn('[getDashboardStats] Rate limit exceeded', { userId: user.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createClient()

    // Fetch classes count
    let classesCount = 0
    if (isTeacher) {
      const { count } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
      classesCount = count || 0
    } else {
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
      classesCount = count || 0
    }

    // Fetch assessments count (completed sessions)
    const { count: assessmentsCount } = await supabase
      .from('assessment_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)

    // Calculate average score from responses (joined through assessment_sessions)
    // SECURITY: Only fetch responses from the current user's sessions
    // PERFORMANCE FIX: Use database aggregation instead of client-side filtering
    // Old: Fetch all responses, filter in JS (.filter((r: any) => r.is_correct))
    // New: COUNT with WHERE clause in database
    // FIX: Use denormalized user_id column (added in Migration 038) instead of invalid join syntax
    const { count: totalResponses, error: totalError } = await supabase
      .from('assessment_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)  // ✅ Fixed: use denormalized column, not 'assessment_sessions.user_id'

    const { count: correctResponses, error: correctError } = await supabase
      .from('assessment_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)  // ✅ Fixed: use denormalized column, not 'assessment_sessions.user_id'
      .eq('is_correct', true)

    if (totalError || correctError) {
      authLogger.error('[getDashboardStats] Error fetching response counts', {
        totalError,
        correctError
      })
    }

    let averageScore: number | null = null
    if (totalResponses && totalResponses > 0 && correctResponses !== null) {
      averageScore = Math.round((correctResponses / totalResponses) * 100)
    }

    // Calculate streak (consecutive days with activity)
    const streakDays = await calculateStreak(supabase, user.id)

    // Get recent activity
    const recentActivity = await getRecentActivity(supabase, user.id, isTeacher)

    return {
      success: true,
      data: {
        classesCount,
        assessmentsCount: assessmentsCount || 0,
        averageScore,
        streakDays,
        recentActivity
      }
    }
  } catch (error) {
    authLogger.error('[getDashboardStats] Error', error instanceof Error ? error : undefined)
    return { success: false, error: 'Failed to load dashboard stats' }
  }
}

/**
 * Get detailed progress stats for progress page
 */
export async function getProgressStats(): Promise<{
  success: boolean
  data?: ProgressStats
  error?: string
}> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // SECURITY: Rate limit progress stats to prevent abuse
    const rateLimitKey = `progress-stats:${user.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.dashboardStats)
    if (!isAllowed) {
      authLogger.warn('[getProgressStats] Rate limit exceeded', { userId: user.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createClient()

    // Get completed assessments count
    const { data: sessions } = await supabase
      .from('assessment_sessions')
      .select('id, started_at, submitted_at')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })

    const assessmentsTaken = sessions?.length || 0

    // Get all responses for score calculation
    const { data: responses } = await supabase
      .from('assessment_responses')
      .select('is_correct, module, rt_ms, session_id')
      .eq('user_id', user.id)

    // Calculate average score
    let averageScore: number | null = null
    let totalTimeSpent = 0
    if (responses && responses.length > 0) {
      const correctCount = responses.filter(r => r.is_correct).length
      averageScore = Math.round((correctCount / responses.length) * 100)
      totalTimeSpent = Math.round(responses.reduce((sum, r) => sum + (r.rt_ms || 0), 0) / 60000) // Convert to minutes
    }

    // Calculate module breakdown
    const moduleBreakdown: ModuleProgress[] = []
    if (responses && responses.length > 0) {
      const moduleMap = new Map<string, { attempted: number; correct: number }>()

      for (const response of responses) {
        const module = response.module || 'Unknown'
        const current = moduleMap.get(module) || { attempted: 0, correct: 0 }
        current.attempted++
        if (response.is_correct) current.correct++
        moduleMap.set(module, current)
      }

      for (const [module, stats] of moduleMap) {
        moduleBreakdown.push({
          module,
          questionsAttempted: stats.attempted,
          correctAnswers: stats.correct,
          averageScore: Math.round((stats.correct / stats.attempted) * 100)
        })
      }
    }

    // Get recent assessment results
    const recentAssessments: AssessmentResult[] = []
    if (sessions && sessions.length > 0) {
      for (const session of sessions.slice(0, 5)) {
        const sessionResponses = responses?.filter(r => r.session_id === session.id) || []
        const correctCount = sessionResponses.filter(r => r.is_correct).length
        const totalQuestions = sessionResponses.length
        const timeSpent = sessionResponses.reduce((sum, r) => sum + (r.rt_ms || 0), 0) / 1000 // seconds

        recentAssessments.push({
          id: session.id,
          completedAt: session.submitted_at || session.started_at,
          score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
          totalQuestions,
          timeSpent: Math.round(timeSpent)
        })
      }
    }

    // Courses completed = unique assessments with score >= 60%
    const coursesCompleted = recentAssessments.filter(a => a.score >= 60).length

    return {
      success: true,
      data: {
        coursesCompleted,
        assessmentsTaken,
        averageScore,
        totalTimeSpent,
        moduleBreakdown,
        recentAssessments
      }
    }
  } catch (error) {
    authLogger.error('[getProgressStats] Error', error instanceof Error ? error : undefined)
    return { success: false, error: 'Failed to load progress stats' }
  }
}

/**
 * Calculate consecutive days with activity (streak)
 */
async function calculateStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  try {
    // Get all session dates for the user
    const { data: sessions } = await supabase
      .from('assessment_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (!sessions || sessions.length === 0) return 0

    // PERFORMANCE FIX: Convert dates array to Set for O(1) lookup
    // Old: dates.includes(dateKey) is O(n) inside 365-iteration loop = O(n²)
    // New: dateSet.has(dateKey) is O(1) inside loop = O(n)
    const dateSet = new Set(sessions.map(s => {
      const date = new Date(s.started_at)
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    }))

    // Calculate streak from today
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`

      if (dateSet.has(dateKey)) {
        streak++
      } else if (i > 0) {
        // Allow skipping today (user might not have done activity yet today)
        break
      }
    }

    return streak
  } catch (error) {
    authLogger.error('[calculateStreak] Error calculating streak', error)
    return 0
  }
}

/**
 * Get recent activity for the user
 */
async function getRecentActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isTeacher: boolean
): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = []

  try {
    // Get recent assessment completions
    const { data: sessions, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('id, started_at, submitted_at')
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(5)

    if (sessionError) {
      authLogger.error('[getRecentActivity] Failed to fetch sessions', sessionError)
    }

    if (sessions && sessions.length > 0) {
      // OPTIMIZATION: Batch fetch all responses instead of per-session loop (N+1 fix)
      const sessionIds = sessions.map(s => s.id)
      const { data: allResponses, error: responseError } = await supabase
        .from('assessment_responses')
        .select('session_id, is_correct')
        .in('session_id', sessionIds)

      if (responseError) {
        authLogger.error('[getRecentActivity] Failed to fetch responses', responseError)
      }

      // Build map of responses by session for O(1) lookup
      const responsesBySession = new Map<string, Array<{ is_correct: boolean }>>()
      if (allResponses) {
        for (const response of allResponses) {
          if (!responsesBySession.has(response.session_id)) {
            responsesBySession.set(response.session_id, [])
          }
          responsesBySession.get(response.session_id)!.push({ is_correct: response.is_correct })
        }
      }

      // Process sessions using pre-fetched responses
      for (const session of sessions) {
        const responses = responsesBySession.get(session.id) || []
        const total = responses.length
        const correct = responses.filter(r => r.is_correct).length
        const score = total > 0 ? Math.round((correct / total) * 100) : 0

        activities.push({
          id: session.id,
          type: 'assessment',
          title: 'Completed Assessment',
          description: `Scored ${score}% (${correct}/${total} correct)`,
          timestamp: session.submitted_at || session.started_at,
          score
        })
      }
    }

    // Get recent class joins (for students)
    if (!isTeacher) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          classes (name)
        `)
        .eq('student_id', userId)
        .order('enrolled_at', { ascending: false })
        .limit(3)

      if (enrollments) {
        for (const enrollment of enrollments) {
          // Supabase returns single related record as object, not array (one-to-one via foreign key)
          const classData = enrollment.classes as unknown as { name: string } | null
          const className = classData?.name || 'Unknown Class'
          activities.push({
            id: enrollment.id,
            type: 'class_join',
            title: 'Joined Class',
            description: className,
            timestamp: enrollment.enrolled_at
          })
        }
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return activities.slice(0, 5)
  } catch (error) {
    authLogger.error('[getRecentActivity] Error fetching recent activity', error)
    return []
  }
}
