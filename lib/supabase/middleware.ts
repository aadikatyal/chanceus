import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse, type NextRequest } from "next/server"

// Specify Edge Runtime
export const runtime = 'edge'

export async function updateSession(request: NextRequest) {
  const res = NextResponse.next()

  // Define auth routes that should bypass session checks
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth/")
  
  // CRITICAL: All auth routes (including /auth/callback) must bypass session checks
  // This allows Supabase to set the session cookie during OAuth callbacks
  if (isAuthRoute) {
    console.log("🔍 DEBUG: Bypassing middleware for auth route:", request.nextUrl.pathname)
    return res
  }

  // Define protected routes that require authentication
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/games") ||
    request.nextUrl.pathname.startsWith("/wallet") ||
    request.nextUrl.pathname.startsWith("/matches") ||
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/tournaments") ||
    request.nextUrl.pathname.startsWith("/analytics") ||
    request.nextUrl.pathname.startsWith("/leaderboards") ||
    request.nextUrl.pathname.startsWith("/rankings") ||
    request.nextUrl.pathname.startsWith("/replays") ||
    request.nextUrl.pathname.startsWith("/chat") ||
    request.nextUrl.pathname.startsWith("/friends") ||
    request.nextUrl.pathname.startsWith("/bars") ||
    request.nextUrl.pathname.startsWith("/bar") ||
    request.nextUrl.pathname.startsWith("/session")

  try {
    // Only check session for protected routes
    if (isProtectedRoute) {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    console.log("🔍 DEBUG: Middleware session check:", { 
      path: request.nextUrl.pathname, 
      hasSession: !!session,
      userId: session?.user?.id 
    })

    // Redirect unauthenticated users from protected routes
      if (!session) {
        const redirectUrl = `/auth/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`
      console.log("🔍 DEBUG: Redirecting unauthenticated user from protected route to login")
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }
    }

    return res
  } catch (error) {
    // If there's an error (e.g., Supabase not configured), just continue
    console.warn("🔍 DEBUG: Middleware error:", error)
    return res
  }
}
