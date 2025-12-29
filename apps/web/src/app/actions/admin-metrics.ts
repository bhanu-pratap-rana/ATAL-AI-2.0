'use server'

import { createAdminClient, verifyAdminAuth } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit } from '@/lib/rate-limiter-distributed'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'

export interface DashboardMetrics {
  totalSchools: number
  totalTeachers: number
  totalStudents: number
  activePins: number
  inactivePins: number
  totalAdmins: number
}

export interface SchoolStats {
  schoolId: string
  schoolName: string
  districtName: string
  teacherCount: number
  studentCount: number
  pinCount: number
  activePinCount: number
}

/**
 * Note: Supabase query results have complex inferred types based on the select clause.
 * Using explicit type assertions in map callbacks for type safety.
 */

/**
 * Get dashboard metrics for super admin dashboard
 * SECURITY: Requires admin or super_admin role
 */
export async function getDashboardMetrics(): Promise<{ success: boolean; data?: DashboardMetrics; error?: string }> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getDashboardMetrics')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-metrics:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getDashboardMetrics] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    // Get school count
    const { count: schoolCount, error: schoolError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })

    if (schoolError) {
      authLogger.error('[getDashboardMetrics] Failed to get school count', schoolError)
      return {
        success: false,
        error: 'Failed to fetch school metrics',
      }
    }

    // Get teacher count from teacher_profiles table
    let teacherCount = 0
    const { count: profileCount, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('*', { count: 'exact', head: true })

    if (teacherError) {
      authLogger.error('[getDashboardMetrics] Failed to get teacher count from profiles', teacherError)
    } else {
      teacherCount = profileCount || 0
    }

    // Get PIN metrics from school_staff_credentials table
    const { count: activePinCount, error: pinError } = await supabase
      .from('school_staff_credentials')
      .select('*', { count: 'exact', head: true })

    if (pinError) {
      authLogger.error('[getDashboardMetrics] Failed to get PIN count', pinError)
    }

    const activePins = activePinCount || 0
    const inactivePins = (schoolCount || 0) - activePins

    // Get student count from student_profiles table (actual enrolled students)
    let studentCount = 0
    const { count: studentProfileCount, error: studentError } = await supabase
      .from('student_profiles')
      .select('*', { count: 'exact', head: true })

    if (studentError) {
      authLogger.error('[getDashboardMetrics] Failed to get student count from profiles', studentError)
    } else {
      studentCount = studentProfileCount || 0
    }

    // Get admin count from auth users
    let adminCount = 0
    let authTeacherCount = 0
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      if (authUsers?.users) {
        // Count admins (admin or super_admin role)
        adminCount = authUsers.users.filter(
          (u) => u.app_metadata?.role === 'admin' || u.app_metadata?.role === 'super_admin'
        ).length
        // Count teachers from auth users
        authTeacherCount = authUsers.users.filter(
          (u) => u.app_metadata?.role === 'teacher'
        ).length
      }
    } catch (err) {
      authLogger.error('[getDashboardMetrics] Failed to list auth users', err)
    }

    // Use the higher count between profiles and auth users
    const finalTeacherCount = Math.max(teacherCount, authTeacherCount)

    const metrics: DashboardMetrics = {
      totalSchools: schoolCount || 0,
      totalTeachers: finalTeacherCount,
      totalStudents: studentCount,
      activePins: activePins,
      inactivePins: inactivePins,
      totalAdmins: adminCount,
    }

    authLogger.info('[getDashboardMetrics] Metrics fetched successfully', { ...metrics })
    return {
      success: true,
      data: metrics,
    }
  } catch (error) {
    authLogger.error('[getDashboardMetrics] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get school statistics by district
 * Uses correct table names per DATABASE.md:
 * - teacher_profiles (not 'teachers')
 * - student_profiles (not 'students')
 * - school_staff_credentials (not 'pins')
 * - schools.district column (not 'districts' table)
 * SECURITY: Requires admin or super_admin role
 */
export async function getSchoolStatsByDistrict(): Promise<{
  success: boolean
  data?: SchoolStats[]
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getSchoolStatsByDistrict')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-school-stats:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getSchoolStatsByDistrict] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    // Get schools - district is a column in schools table, not a separate table
    const { data: schools, error: schoolError } = await supabase
      .from('schools')
      .select('id, school_name, district')

    if (schoolError) {
      authLogger.error('[getSchoolStatsByDistrict] Failed to get schools', schoolError)
      return {
        success: false,
        error: 'Failed to fetch school statistics',
      }
    }

    if (!schools || schools.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    // Define proper type for school data
    interface SchoolData {
      id: string
      school_name: string
      district: string
    }

    // Get teacher and student counts for each school
    const schoolStats: SchoolStats[] = await Promise.all(
      (schools as SchoolData[]).map(async (school) => {
        // Get teacher count from teacher_profiles table
        const { count: teacherCount } = await supabase
          .from('teacher_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)

        // Get student count from student_profiles table
        const { count: studentCount } = await supabase
          .from('student_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)

        // Get PIN from school_staff_credentials table
        // Note: Each school has at most one PIN record (school_id is unique)
        const { data: pinData } = await supabase
          .from('school_staff_credentials')
          .select('id, deleted_at')
          .eq('school_id', school.id)
          .maybeSingle()

        // A PIN is "active" if it exists and is not deleted
        const hasActivePIN = pinData && !pinData.deleted_at

        return {
          schoolId: school.id,
          schoolName: school.school_name,
          districtName: school.district || 'Unknown',
          teacherCount: teacherCount || 0,
          studentCount: studentCount || 0,
          pinCount: pinData ? 1 : 0,
          activePinCount: hasActivePIN ? 1 : 0,
        }
      })
    )

    return {
      success: true,
      data: schoolStats,
    }
  } catch (error) {
    authLogger.error('[getSchoolStatsByDistrict] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get schools with active PINs
 * SECURITY: Requires admin or super_admin role
 */
export async function getSchoolsWithActivePINs(): Promise<{
  success: boolean
  data?: Array<{
    schoolId: string
    schoolName: string
    schoolCode: string
    districtName: string
    lastRotatedAt: string | null
  }>
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getSchoolsWithActivePINs')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-active-pins:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getSchoolsWithActivePINs] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    // Get all schools with PINs
    const { data: pins, error: pinError } = await supabase
      .from('school_staff_credentials')
      .select('school_id, rotated_at, created_at')

    if (pinError) {
      authLogger.error('[getSchoolsWithActivePINs] Failed to get PINs', pinError)
      return {
        success: false,
        error: 'Failed to fetch PIN data',
      }
    }

    if (!pins || pins.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    // Get school details for schools with PINs
    const schoolIds = pins.map((p) => p.school_id)
    const { data: schools, error: schoolError } = await supabase
      .from('schools')
      .select('id, school_name, school_code, district')
      .in('id', schoolIds)

    if (schoolError) {
      authLogger.error('[getSchoolsWithActivePINs] Failed to get schools', schoolError)
      return {
        success: false,
        error: 'Failed to fetch school data',
      }
    }

    // Define proper type for school data
    interface SchoolWithPINData {
      id: string
      school_name: string
      school_code: string | null
      district: string | null
    }

    // Map PIN data to schools
    const pinMap = new Map(pins.map((p) => [p.school_id, p]))
    const result = (schools as SchoolWithPINData[] || []).map((school) => {
      const pin = pinMap.get(school.id)
      return {
        schoolId: school.id,
        schoolName: school.school_name,
        schoolCode: school.school_code || 'N/A',
        districtName: school.district || 'Unknown',
        lastRotatedAt: pin?.rotated_at || pin?.created_at || null,
      }
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    authLogger.error('[getSchoolsWithActivePINs] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get recent activity count for last N days
 * SECURITY: Requires admin or super_admin role
 */
export async function getRecentActivityCount(days: number = 7): Promise<{
  success: boolean
  data?: { date: string; count: number }[]
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getRecentActivityCount')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-activity:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getRecentActivityCount] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()
    const activityData: { date: string; count: number }[] = []

    // Get activity for last N days
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // Count teacher profiles created
      const { count } = await supabase
        .from('teacher_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`)

      activityData.push({
        date: dateStr,
        count: count || 0,
      })
    }

    return {
      success: true,
      data: activityData.reverse(),
    }
  } catch (error) {
    authLogger.error('[getRecentActivityCount] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get all schools list
 * SECURITY: Requires admin or super_admin role
 */
export async function getAllSchools(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    schoolName: string
    schoolCode: string
    district: string
    block: string | null
    hasPIN: boolean
  }>
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getAllSchools')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-all-schools:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getAllSchools] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, school_name, school_code, district, block')
      .order('school_name')

    if (error) {
      authLogger.error('[getAllSchools] Failed to get schools', error)
      return { success: false, error: 'Failed to fetch schools' }
    }

    // Get schools with PINs
    const { data: pins } = await supabase
      .from('school_staff_credentials')
      .select('school_id')

    const schoolsWithPINs = new Set((pins || []).map((p: { school_id: string }) => p.school_id))

    const result = (schools || []).map((school: {
      id: string
      school_name: string
      school_code: string
      district: string
      block: string | null
    }) => ({
      id: school.id,
      schoolName: school.school_name,
      schoolCode: school.school_code || 'N/A',
      district: school.district || 'Unknown',
      block: school.block,
      hasPIN: schoolsWithPINs.has(school.id),
    }))

    return { success: true, data: result }
  } catch (error) {
    authLogger.error('[getAllSchools] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get all teachers list
 * Uses teacher_profiles table as the source of truth (not app_metadata.role)
 * SECURITY: Requires admin or super_admin role
 */
export async function getAllTeachers(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    email: string
    name: string
    phone: string | null
    schoolName: string
    schoolCode: string
    createdAt: string
  }>
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getAllTeachers')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-all-teachers:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getAllTeachers] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    // Get teacher profiles with school info - teacher_profiles is the source of truth
    const { data: profiles, error: profileError } = await supabase
      .from('teacher_profiles')
      .select(`
        user_id,
        name,
        phone,
        school_code,
        created_at,
        schools!inner(school_name)
      `)

    if (profileError) {
      authLogger.error('[getAllTeachers] Failed to fetch teacher profiles', profileError)
      return { success: false, error: 'Failed to fetch teacher profiles' }
    }

    // Get auth users to get email addresses
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userMap = new Map((authUsers?.users || []).map((u) => [u.id, u]))

    // Type for profile data with joined school
    // Note: Double cast required because Supabase's TypeScript types don't properly
    // infer joined relations. This is the documented pattern for typed joins.
    // schools!inner guarantees schools is never null (INNER JOIN behavior)
    interface TeacherProfileData {
      user_id: string
      name: string
      phone: string | null
      school_code: string
      created_at: string
      schools: { school_name: string }
    }

    const typedProfiles = (profiles ?? []) as unknown as TeacherProfileData[]
    const result = typedProfiles.map((profile) => {
      const authUser = userMap.get(profile.user_id)
      return {
        id: profile.user_id,
        email: authUser?.email || '',
        name: profile.name || 'Unknown',
        phone: profile.phone || null,
        schoolName: profile.schools.school_name,
        schoolCode: profile.school_code || 'N/A',
        createdAt: profile.created_at,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    authLogger.error('[getAllTeachers] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get all students list
 * Students are fetched from student_profiles table (actual enrolled students)
 * SECURITY: Requires admin or super_admin role
 */
export async function getAllStudents(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    email: string
    username: string | null
    name: string
    phone: string | null
    className: string | null
    schoolName: string | null
    createdAt: string
    lastSignIn: string | null
  }>
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getAllStudents')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-all-students:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getAllStudents] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    // Get student profiles with class and school info
    const { data: profiles, error: profileError } = await supabase
      .from('student_profiles')
      .select(`
        user_id,
        name,
        phone,
        class_name,
        school_name,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (profileError) {
      authLogger.error('[getAllStudents] Failed to fetch student profiles', profileError)
      return { success: false, error: 'Failed to fetch student profiles' }
    }

    // Get auth users to get email addresses and usernames
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userMap = new Map((authUsers?.users || []).map((u) => [u.id, u]))

    // Type for profile data
    interface StudentProfileData {
      user_id: string
      name: string | null
      phone: string | null
      class_name: string | null
      school_name: string | null
      created_at: string
    }

    const typedProfiles = (profiles ?? []) as StudentProfileData[]
    const result = typedProfiles.map((profile) => {
      const authUser = userMap.get(profile.user_id)
      const username = authUser?.user_metadata?.username as string || null
      const authType = authUser?.user_metadata?.auth_type as string || 'email'
      // For username auth, don't show the internal email
      const displayEmail = authType === 'username' ? '' : (authUser?.email || '')

      return {
        id: profile.user_id,
        email: displayEmail,
        username: username,
        name: profile.name || 'Unknown',
        phone: profile.phone || null,
        className: profile.class_name || null,
        schoolName: profile.school_name || null,
        createdAt: profile.created_at,
        lastSignIn: authUser?.last_sign_in_at || null,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    authLogger.error('[getAllStudents] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get schools without PINs (inactive)
 * SECURITY: Requires admin or super_admin role
 */
export async function getSchoolsWithoutPINs(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    schoolName: string
    schoolCode: string
    district: string
  }>
  error?: string
}> {
  try {
    // SECURITY: Verify admin authorization
    const authCheck = await verifyAdminAuth('getSchoolsWithoutPINs')
    if (!authCheck.authorized) {
      return authCheck.error!
    }

    // SECURITY: Rate limit admin metrics to prevent abuse
    const rateLimitKey = `admin-no-pins:${authCheck.user!.id}`
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.adminMetrics)
    if (!isAllowed) {
      authLogger.warn('[getSchoolsWithoutPINs] Rate limit exceeded', { userId: authCheck.user!.id })
      return { success: false, error: 'Too many requests. Please wait before trying again.' }
    }

    const supabase = await createAdminClient()

    // Get all schools
    const { data: schools, error: schoolError } = await supabase
      .from('schools')
      .select('id, school_name, school_code, district')
      .order('school_name')

    if (schoolError) {
      authLogger.error('[getSchoolsWithoutPINs] Failed to get schools', schoolError)
      return { success: false, error: 'Failed to fetch schools' }
    }

    // Get schools with PINs
    const { data: pins } = await supabase
      .from('school_staff_credentials')
      .select('school_id')

    const schoolsWithPINs = new Set((pins || []).map((p: { school_id: string }) => p.school_id))

    // Filter schools without PINs
    const result = (schools || [])
      .filter((school: { id: string }) => !schoolsWithPINs.has(school.id))
      .map((school: {
        id: string
        school_name: string
        school_code: string
        district: string
      }) => ({
        id: school.id,
        schoolName: school.school_name,
        schoolCode: school.school_code || 'N/A',
        district: school.district || 'Unknown',
      }))

    return { success: true, data: result }
  } catch (error) {
    authLogger.error('[getSchoolsWithoutPINs] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
