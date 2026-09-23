import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { ensurePublicUserProfile } from "@/lib/ensure-public-user-profile"
import { safeAppPath } from "@/lib/safe-redirect"

function callbackRedirectPath(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const raw = params.get("redirect") ?? params.get("next")
  return safeAppPath(raw, "/dashboard")
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const oauthError = requestUrl.searchParams.get("error")
  const oauthErrorDescription = requestUrl.searchParams.get("error_description")
  const code = requestUrl.searchParams.get("code")
  const redirectPath = callbackRedirectPath(request)
  const redirectTo = new URL(redirectPath, requestUrl.origin)

  if (oauthError) {
    console.error("Auth callback provider error:", oauthError, oauthErrorDescription)
    const login = new URL("/auth/login", requestUrl.origin)
    if (oauthErrorDescription?.toLowerCase().includes("rate") || oauthError === "too_many_requests") {
      login.searchParams.set("error", "rate_limit")
    } else {
      login.searchParams.set("error", "auth_error")
    }
    return NextResponse.redirect(login)
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url))
  }

  const response = NextResponse.redirect(redirectTo)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession()

  if (existingSession?.user) {
    await ensurePublicUserProfile(existingSession.user, supabase)
    return response
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Auth callback exchangeCodeForSession:", error.message)
    if (error.message?.includes("rate limit") || error.status === 429) {
      return NextResponse.redirect(new URL("/auth/login?error=rate_limit", request.url))
    }
    if (error.message?.includes("invalid_grant") || error.message?.includes("code")) {
      return NextResponse.redirect(new URL("/auth/login?error=invalid_code", request.url))
    }
    return NextResponse.redirect(new URL("/auth/login?error=auth_error", request.url))
  }

  if (data.user) {
    await ensurePublicUserProfile(data.user, supabase)
  }

  return response
}
