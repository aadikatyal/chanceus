"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"

type AuthOAuthButtonsProps = {
  redirectUrl?: string
  oauthDisabled?: boolean
}

function buildClientCallbackUrl(postLoginPath?: string) {
  const base = `${window.location.origin}/auth/callback`
  if (!postLoginPath || !postLoginPath.startsWith("/") || postLoginPath.startsWith("//") || postLoginPath.startsWith("/auth")) {
    return base
  }
  return `${base}?redirect=${encodeURIComponent(postLoginPath)}`
}

function OAuthButton({
  provider,
  label,
  className,
  redirectUrl,
  oauthDisabled,
}: {
  provider: "google" | "apple"
  label: string
  className: string
  redirectUrl?: string
  oauthDisabled?: boolean
}) {
  const [loading, setLoading] = useState(false)

  const startOAuth = async () => {
    if (loading || oauthDisabled) return
    setLoading(true)
    try {
      const redirectTo = buildClientCallbackUrl(redirectUrl)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error) {
        const msg = error.message?.toLowerCase().includes("rate")
          ? "Too many sign-in attempts. Wait a few minutes, then try again."
          : error.message
        toast.error(msg)
        setLoading(false)
        return
      }
      if (data?.url) {
        window.location.assign(data.url)
        return
      }
      toast.error("Could not start sign in. Try again.")
      setLoading(false)
    } catch {
      toast.error("Could not start sign in. Try again.")
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading || oauthDisabled}
      onClick={startOAuth}
      aria-label={label}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading ? <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden /> : null}
      {provider === "google" ? (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
      ) : (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      )}
      {provider === "google" ? "Continue with Google" : "Continue with Apple"}
    </button>
  )
}

export function GoogleOAuthButton({ redirectUrl, oauthDisabled }: AuthOAuthButtonsProps) {
  return (
    <OAuthButton
      provider="google"
      label="Continue with Google"
      redirectUrl={redirectUrl}
      oauthDisabled={oauthDisabled}
      className="chance-auth-oauth chance-auth-oauth--google chance-focus-ring w-full"
    />
  )
}

export function AppleOAuthButton({ redirectUrl, oauthDisabled }: AuthOAuthButtonsProps) {
  return (
    <OAuthButton
      provider="apple"
      label="Continue with Apple"
      redirectUrl={redirectUrl}
      oauthDisabled={oauthDisabled}
      className="chance-auth-oauth chance-auth-oauth--apple chance-focus-ring w-full"
    />
  )
}
