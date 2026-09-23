import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const redirect = requestUrl.searchParams.get("redirect")
  
  console.log("🔍 DEBUG: Auth callback received:", { code: code ? "present" : "missing", next, redirect })
  
  // Use redirect parameter if available, otherwise next, otherwise dashboard
  const redirectUrl = redirect || next || "/dashboard"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      console.log("🔍 DEBUG: Exchanging code for session...")
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error("🔍 DEBUG: Error exchanging code for session:", error)
        
        // Handle specific error types
        if (error.message?.includes('rate limit') || error.status === 429) {
          console.log("🔍 DEBUG: Rate limit detected, redirecting to login with retry message")
          return NextResponse.redirect(new URL("/auth/login?error=rate_limit", request.url))
        } else if (error.message?.includes('invalid_grant') || error.message?.includes('code')) {
          console.log("🔍 DEBUG: Invalid code, redirecting to login")
          return NextResponse.redirect(new URL("/auth/login?error=invalid_code", request.url))
        } else {
          console.log("🔍 DEBUG: Generic auth error")
          return NextResponse.redirect(new URL("/auth/login?error=auth_error", request.url))
        }
      }
      
      console.log("🔍 DEBUG: Successfully exchanged code for session:", { 
        user: data.user ? "present" : "missing", 
        session: data.session ? "present" : "missing" 
      })
    } catch (error) {
      console.error("🔍 DEBUG: Exception during code exchange:", error)
      return NextResponse.redirect(new URL("/auth/login?error=auth_error", request.url))
    }
  } else {
    console.log("🔍 DEBUG: No code provided in callback")
  }

  console.log("🔍 DEBUG: Redirecting to:", redirectUrl)
  // Redirect to the specified URL
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
