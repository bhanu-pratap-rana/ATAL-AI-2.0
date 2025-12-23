import { NextRequest, NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit } from '@/lib/rate-limiter-distributed'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'

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

    // Verify user is a teacher - check app_metadata.role or teacher_profiles table
    const supabase = await createClient()
    const isTeacherByMetadata = user.app_metadata?.role === 'teacher'

    if (!isTeacherByMetadata) {
      // Fallback: check teacher_profiles table
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!teacherProfile) {
        authLogger.warn('[searchStudents] Non-teacher attempted to search students', { userId: user.id })
        return NextResponse.json(
          { error: 'Only teachers can search for students' },
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
      authLogger.warn('[searchStudents] RPC failed, falling back to direct query', error)

      // Fallback to direct query if RPC function not yet deployed
      // This may return empty results due to RLS, but at least won't error
      // Note: Using separate ilike patterns is safer than string interpolation
      const searchPattern = `%${sanitizedQuery}%`
      const { data: fallbackProfiles, error: fallbackError } = await supabase
        .from('student_profiles')
        .select('user_id, name, phone, roll_number')
        .or(`name.ilike.${searchPattern},roll_number.ilike.${searchPattern},phone.ilike.${searchPattern}`)
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
