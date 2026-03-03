"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signIn, signInWithGoogle, signInWithApple } from "@/lib/actions"
import { AuthRateLimiter, getRateLimitMessage } from "@/lib/auth-utils"
import { toast } from "sonner"

/** Email/password submit button that DOES need useFormStatus */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#FFA500] hover:bg-[#FF8C00] text-black font-semibold py-6 text-lg rounded-xl transition-all duration-300"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Entering the Arena...
        </>
      ) : (
        <>
          <Gamepad2 className="mr-2 h-5 w-5" />
          Enter ChanceUS
        </>
      )}
    </Button>
  )
}

/** Google SSO button (plain button to guarantee a white background) */
function GoogleSignInButton({ redirectUrl }: { redirectUrl?: string }) {
  return (
    <form action={signInWithGoogle} className="w-full">
      {redirectUrl && <input type="hidden" name="redirect" value={redirectUrl} />}
      <button
        type="submit"
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-offset-2 focus:ring-offset-black"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>
    </form>
  )
}

/** Apple SSO button (black button per Apple HIG) */
function AppleSignInButton({ redirectUrl }: { redirectUrl?: string }) {
  return (
    <form action={signInWithApple} className="w-full">
      {redirectUrl && <input type="hidden" name="redirect" value={redirectUrl} />}
      <button
        type="submit"
        aria-label="Continue with Apple"
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-600 bg-black px-4 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-offset-2 focus:ring-offset-black"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        <span>Continue with Apple</span>
      </button>
    </form>
  )
}

interface LoginFormProps {
  redirectUrl?: string
}

export default function LoginForm({ redirectUrl }: LoginFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)

  useEffect(() => {
    if (state?.success) {
      const targetUrl = redirectUrl || "/dashboard"
      console.log("🔍 DEBUG: Login successful, redirecting to:", targetUrl)
      console.log("🔍 DEBUG: Original redirectUrl:", redirectUrl)
      router.push(targetUrl)
    }
  }, [state, router, redirectUrl])

  // Check for URL error parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    if (error) {
      // Show specific error messages
      let errorMessage = "Login failed. Please try again."
      
      if (error === 'rate_limit') {
        errorMessage = "Rate limit exceeded. Please wait a few minutes before trying again."
        // Log as warning since rate limiting is expected behavior
        console.warn("Rate limit detected - user will be notified via toast")
      } else if (error === 'invalid_code') {
        errorMessage = "Login session expired. Please try logging in again."
      } else if (error === 'auth_error') {
        errorMessage = "Authentication failed. Please try again."
      }
      
      // Use toast instead of alert for better UX
      toast.error(errorMessage)
      
      // Clean up URL by removing error parameter
      urlParams.delete('error')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  return (
    <Card className="w-full max-w-md bg-gray-900/90 border-gray-700/50 backdrop-blur-sm">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <img src="/chanceus-eagle.png" alt="ChanceUS" className="h-16" />
        </div>
        <CardTitle className="text-3xl font-bold text-white">Welcome Back</CardTitle>
        <CardDescription className="text-gray-400 text-lg">Ready to test your skills and win big?</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <GoogleSignInButton redirectUrl={redirectUrl} />
        <AppleSignInButton redirectUrl={redirectUrl} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-900/90 px-2 text-gray-400">Or continue with email</span>
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          {redirectUrl && <input type="hidden" name="redirect" value={redirectUrl} />}
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-center">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="player@chanceus.com"
                required
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#FFA500] focus:ring-[#FFA500]/20 rounded-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-gray-900 border-gray-700 text-white focus:border-[#FFA500] focus:ring-[#FFA500]/20 rounded-lg h-12"
              />
            </div>
          </div>

          <SubmitButton />

          <div className="text-center text-gray-400">
            New to ChanceUS?{" "}
            <Link href="/auth/sign-up" className="text-[#FFA500] hover:text-[#FF8C00] font-medium transition-colors">
              Create Account
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}