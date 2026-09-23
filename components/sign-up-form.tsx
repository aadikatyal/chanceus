"use client"

import { useActionState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { AppleOAuthButton, GoogleOAuthButton } from "@/components/auth/auth-oauth-buttons"
import AuthPasswordField from "@/components/auth/auth-password-field"
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthPanel,
  AuthPanelHeader,
  AuthSuccess,
} from "@/components/auth/auth-form-ui"

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

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, null)
  const searchParams = useSearchParams()
  const oauthDisabled = useMemo(() => searchParams.get("error") === "rate_limit", [searchParams])

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "rate_limit") {
      toast.error("Too many sign-in attempts. Wait 5–10 minutes before trying Google or Apple again.")
    }
  }, [searchParams])

  return (
    <AuthPanel>
      <AuthPanelHeader title="Create account" description="One profile. Every match on your record." />

      <div className="chance-auth-form">
        <GoogleOAuthButton oauthDisabled={oauthDisabled} />
        <AppleOAuthButton oauthDisabled={oauthDisabled} />
        {oauthDisabled ? (
          <p className="chance-auth-hint text-center" role="status">
            Social sign-in is paused briefly. Use email sign-up below.
          </p>
        ) : null}
        <AuthDivider />

        <form action={formAction} className="chance-auth-form">
          {state?.error ? <AuthError message={state.error} /> : null}
          {state?.success ? <AuthSuccess message={state.success} /> : null}

          <AuthField
            id="username"
            name="username"
            label="Username"
            placeholder="champion_player"
            autoComplete="username"
            hint="Your unique handle in the arena"
          />
          <AuthField id="displayName" name="displayName" label="Display name" placeholder="Champion Player" autoComplete="name" />

          <div className="chance-auth-field">
            <label htmlFor="avatar" className="chance-auth-label">
              Profile picture
            </label>
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              className="chance-auth-input chance-auth-input--file"
            />
            <p className="chance-auth-hint">Optional — add a face to your record</p>
          </div>

          <AuthField
            id="email"
            name="email"
            label="Email"
            type="email"
            placeholder="player@chanceus.com"
            autoComplete="email"
          />
          <AuthPasswordField id="password" name="password" label="Password" autoComplete="new-password" />

          <SubmitButton />

          <p className="chance-auth-footer-link">
            Already competing?{" "}
            <Link href="/auth/login">Sign in</Link>
          </p>
        </form>
      </div>
    </AuthPanel>
  )
}
