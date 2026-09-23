"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signIn } from "@/lib/actions"
import { toast } from "sonner"
import { AppleOAuthButton, GoogleOAuthButton } from "@/components/auth/auth-oauth-buttons"
import AuthPasswordField from "@/components/auth/auth-password-field"
import { AuthDivider, AuthError, AuthField, AuthPanel, AuthPanelHeader } from "@/components/auth/auth-form-ui"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="chance-auth-submit chance-hero-cta-primary chance-focus-ring chance-pressable">
      {pending ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Entering the arena…
        </>
      ) : (
        "Enter ChanceUS"
      )}
    </button>
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
      router.push(targetUrl)
    }
  }, [state, router, redirectUrl])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get("error")
    if (!error) return

    let errorMessage = "Login failed. Please try again."
    if (error === "rate_limit") {
      errorMessage = "Rate limit exceeded. Please wait a few minutes before trying again."
    } else if (error === "invalid_code") {
      errorMessage = "Login session expired. Please try logging in again."
    } else if (error === "auth_error") {
      errorMessage = "Authentication failed. Please try again."
    }

    toast.error(errorMessage)
    urlParams.delete("error")
    const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : "")
    window.history.replaceState({}, "", newUrl)
  }, [])

  return (
    <AuthPanel>
      <AuthPanelHeader title="Sign in" description="Pick up where you left off. Your record is waiting." />

      <div className="chance-auth-form">
        <GoogleOAuthButton redirectUrl={redirectUrl} />
        <AppleOAuthButton redirectUrl={redirectUrl} />
        <AuthDivider />

        <form action={formAction} className="chance-auth-form">
          {redirectUrl ? <input type="hidden" name="redirect" value={redirectUrl} /> : null}
          {state?.error ? <AuthError message={state.error} /> : null}

          <AuthField
            id="email"
            name="email"
            label="Email"
            type="email"
            placeholder="player@chanceus.com"
            autoComplete="email"
          />
          <AuthPasswordField id="password" name="password" label="Password" autoComplete="current-password" />

          <SubmitButton />

          <p className="chance-auth-footer-link">
            New here?{" "}
            <Link href="/auth/sign-up">Create your account</Link>
          </p>
        </form>
      </div>
    </AuthPanel>
  )
}
