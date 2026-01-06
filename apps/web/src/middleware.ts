import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createCORSHeaders } from '@/lib/cors'

/**
 * Creates a Supabase client configured for middleware
 * Centralizes cookie handling for both server actions and regular routes
 * Eliminates duplicate client initialization code
 */
function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  // Handle CORS preflight for API routes
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const corsHeaders = createCORSHeaders(origin)
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add CORS headers to all responses
  const origin = request.headers.get('origin')
  const corsHeaders = createCORSHeaders(origin)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Skip middleware logic for server actions (they have their own auth checks)
  // Server actions are POST requests with specific content types
  const isServerAction = request.method === 'POST' && (
    request.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ||
    request.headers.get('next-action') !== null
  )

  // Create Supabase client (handles both server actions and regular routes)
  const supabase = createMiddlewareSupabaseClient(request, response)

  if (isServerAction) {
    // Still need to refresh auth token for server actions
    await supabase.auth.getUser()
    return response
  }

  // CRITICAL: This refreshes the auth token and sets cookies
  const { data: { user } } = await supabase.auth.getUser()

  // Define route types clearly
  const pathname = request.nextUrl.pathname
  const isProtectedRoute = pathname.startsWith('/app')
  const isAdminLoginRoute = pathname.startsWith('/admin/login')
  const isStudentAuthRoute = pathname.startsWith('/student/start')
  const isTeacherAuthRoute = pathname.startsWith('/teacher/start')
  const isJoinRoute = pathname.startsWith('/join')
  const isAuthPage = isStudentAuthRoute || isTeacherAuthRoute

  // Route access control logic (simplified for clarity)
  if (isAdminLoginRoute) {
    // Admin login page is accessible without authentication
    return response
  }

  if (isProtectedRoute && !user) {
    // Protected app routes require authentication
    return NextResponse.redirect(new URL('/student/start', request.url))
  }

  if (isAuthPage && user && !isJoinRoute) {
    // Auth pages (login/register) should redirect to dashboard if already authenticated
    // Exception: join routes handle their own logic
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/admin/login', '/student/start', '/teacher/start', '/teacher/:path*', '/join'],
}
