import { NextRequest, NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit } from '@/lib/rate-limiter-distributed'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import { isTeacherOrHigher } from '@/lib/auth/role-utils'

// Type definitions for API responses
export interface Student {
  id: string
  name: string
  rollNumber: string | null
  phone: string | null
}

export interface SearchStudentsSuccessResponse {
  students: Student[]
}

export interface ErrorResponse {
  error: string
}

export type SearchStudentsResponse = SearchStudentsSuccessResponse | ErrorResponse

// Use centralized rate limit
const SEARCH_RATE_LIMIT = RATE_LIMITS.studentSearch

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a teacher or higher (respects role hierarchy: teacher, admin, super_admin)
    const supabase = await createClient()
    const hasTeacherOrHigherRole = isTeacherOrHigher(user.app_metadata?.role)

    if (!hasTeacherOrHigherRole) {
      // Fallback: check teacher_profiles table for users without explicit role metadata
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!teacherProfile) {
        authLogger.warn('[searchStudents] Non-teacher attempted to search students', { userId: user.id, role: user.app_metadata?.role })
        return NextResponse.json(
          { error: 'Only teachers and administrators can search for students' },
          { status: 403 }
        )
      }
    }

    // Apply rate limiting per user
    const isAllowed = await checkRateLimit(`search-students:${user.id}`, SEARCH_RATE_LIMIT)
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many search requests. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query parameter' },
        { status: 400 }
      )
    }

    const sanitizedQuery = query.trim().slice(0, 50) // Max 50 characters

    if (sanitizedQuery.length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must not be empty' },
        { status: 400 }
      )
    }

    // Use SECURITY DEFINER RPC function for teacher search
    // This bypasses RLS that would otherwise block teachers from seeing student_profiles
    const { data: studentProfiles, error } = await supabase
      .rpc('search_students_for_teacher', {
        p_search_query: sanitizedQuery,
        p_limit: 10,
      })

    if (error) {
      authLogger.warn('[searchStudents] RPC failed, falling back to restricted query', error)

      // SECURITY: Fallback query must be restricted to teacher's own classes
      // Do NOT search across ALL students - that bypasses access control

      // Step 1: Get teacher's classes
      const { data: teacherClasses, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)

      if (classError) {
        authLogger.error('[searchStudents] Failed to fetch teacher classes', classError)
        return NextResponse.json(
          { error: 'Failed to search students' },
          { status: 500 }
        )
      }

      const classIds = (teacherClasses || []).map(c => c.id)

      if (classIds.length === 0) {
        // Teacher has no classes
        return NextResponse.json({ students: [] })
      }

      // Step 2: Get students enrolled ONLY in teacher's classes
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('student_id')
        .in('class_id', classIds)

      if (enrollmentError) {
        authLogger.error('[searchStudents] Failed to fetch enrollments', enrollmentError)
        return NextResponse.json(
          { error: 'Failed to search students' },
          { status: 500 }
        )
      }

      const studentIds = (enrollments || []).map(e => e.student_id)

      if (studentIds.length === 0) {
        // No students enrolled in teacher's classes
        return NextResponse.json({ students: [] })
      }

      // Step 3: Search ONLY students enrolled in teacher's classes
      const searchPattern = `%${sanitizedQuery}%`

      // SECURITY: Build safe OR filters to avoid injection
      // Use helper function to safely construct filter strings
      const buildSafeFilter = (field: string, pattern: string): string => {
        // Validate pattern contains only safe characters
        if (!/^%[\w\s\-\.]*%$/.test(pattern)) {
          throw new Error('Invalid search pattern')
        }
        return `${field}.ilike.${pattern}`
      }

      try {
        const searchFilters = [
          buildSafeFilter('name', searchPattern),
          buildSafeFilter('roll_number', searchPattern),
        ]

        // Only include phone in search if it's not empty (to avoid null comparison issues)
        if (sanitizedQuery.length > 0) {
          searchFilters.push(buildSafeFilter('phone', searchPattern))
        }

        const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from('student_profiles')
          .select('user_id, name, phone, roll_number')
          .in('user_id', studentIds)  // SECURITY: Restrict to teacher's students only
          .or(searchFilters.join(','), { referencedTable: 'student_profiles' })
          .limit(10)

        if (fallbackError) {
          authLogger.error('[searchStudents] Fallback query also failed', fallbackError)
          return NextResponse.json(
            { error: 'Failed to search students' },
            { status: 500 }
          )
        }

        const students = (fallbackProfiles || []).map(profile => ({
          id: profile.user_id,
          name: profile.name || 'Unknown',
          rollNumber: profile.roll_number || null,
          phone: profile.phone || null,
        }))

        return NextResponse.json({ students })
      } catch (filterError) {
        authLogger.error('[searchStudents] Invalid search filter', filterError)
        return NextResponse.json(
          { error: 'Invalid search pattern' },
          { status: 400 }
        )
      }
    }

    // Map RPC result to expected response format
    const students = (studentProfiles || []).map((profile: {
      user_id: string
      name: string | null
      phone: string | null
      roll_number: string | null
      class_name: string | null
    }) => ({
      id: profile.user_id,
      name: profile.name || 'Unknown',
      rollNumber: profile.roll_number || null,
      phone: profile.phone || null,
    }))

    return NextResponse.json({
      students,
    })
  } catch (error) {
    authLogger.error('[searchStudents] Unexpected error', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
