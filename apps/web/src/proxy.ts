/**
 * Next.js Middleware — Supabase Session Refresh
 *
 * This middleware runs before every non-static request and refreshes
 * the Supabase auth session, writing updated cookies onto the response.
 *
 * WHY THIS IS REQUIRED:
 * Without this file, createClient() in Server Components tries to call
 * cookies().set() when Supabase refreshes a near-expired token. Next.js
 * throws because Server Components cannot set cookies — only Server Actions
 * and Route Handlers can. The error is caught and logged as:
 *   "[AUTH:DEBUG] Cookie setAll called from Server Component"
 *
 * With this middleware, the session is refreshed here (in middleware,
 * where cookies CAN be set) so Server Components never need to set them.
 *
 * IMPORTANT: Do NOT add any logic between createServerClient() and
 * supabase.auth.getUser(). Doing so can cause random session invalidation.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Auth redirects remain in each page.tsx so they stay co-located with
 * the routes they protect (easier to audit and maintain).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Block dev-only routes in production
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.pathname.startsWith("/ui-preview")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Start with a pass-through response that forwards the request unchanged.
  // setAll() below will replace this with a new response that carries the
  // refreshed session cookies.
  let supabaseResponse = NextResponse.next({ request });

  // The middleware runs in the edge runtime, which does NOT execute the
  // module-load validation in supabase-server.ts. If the Supabase env is
  // missing or malformed, constructing the client with "" throws
  // "Invalid supabaseUrl" — and because this middleware runs on every
  // non-static path, that turns a config error into a site-wide 500,
  // including the offline fallback and static pages. Guard it: skip the
  // session refresh and let the request through. Page-level auth guards
  // still enforce access control on their own.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey) {
    console.error(
      "[proxy] Supabase env missing/invalid — skipping session refresh. " +
        "Set NEXT_PUBLIC_SUPABASE_URL (http/https) and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagate cookies onto the request object so getAll() on the
          // same request sees the updated values immediately.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Create a new response that carries the refreshed cookies to
          // the browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — updates the cookie if the token has rotated.
  // getUser() is used (not getSession()) because it validates the token
  // against the Supabase server; getSession() only reads the local cookie.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export default proxy;

/**
 * True only when `value` is a non-empty, parseable http(s) URL. Used to
 * detect a missing/malformed Supabase URL before it reaches
 * createServerClient (which throws "Invalid supabaseUrl" on bad input).
 */
function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    /*
     * Run middleware on all paths EXCEPT:
     * - _next/static  — pre-built static files (JS, CSS)
     * - _next/image   — Next.js image optimisation endpoint
     * - favicon.ico   — browser tab icon
     * - image files   — svg, png, jpg, jpeg, gif, webp, ico
     *
     * This pattern intentionally includes /api/* routes so that
     * the session is also refreshed before API Route Handlers run.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)", // NOSONAR — String.raw breaks Next.js static matcher analysis
  ],
};
