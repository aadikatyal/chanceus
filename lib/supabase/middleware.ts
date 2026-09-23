import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth/")

  if (isAuthRoute) {
    return response
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
    request.nextUrl.pathname.startsWith("/dms") ||
    request.nextUrl.pathname.startsWith("/friends") ||
    request.nextUrl.pathname.startsWith("/bars") ||
    request.nextUrl.pathname.startsWith("/bar") ||
    request.nextUrl.pathname.startsWith("/session")

  if (!isProtectedRoute) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    return response
  } catch (error) {
    console.warn("Middleware auth error:", error)
    return response
  }
}
