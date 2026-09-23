import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"
import AuthMarketingShell from "@/components/app/auth-marketing-shell"
import { ChanceText } from "@/components/design-system/typography"
import { fetchPublicLandingLive } from "@/lib/fetch-public-landing-live"

export default async function SignUpPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <ChanceText as="h1" variant="h2">
          Connect Supabase to get started
        </ChanceText>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (authUser) {
    const { data: profile } = await supabase.from("users").select("id").eq("id", authUser.id).maybeSingle()
    if (profile) redirect("/dashboard")
  }

  const live = await fetchPublicLandingLive()

  return (
    <AuthMarketingShell variant="signup" live={live}>
      <SignUpForm />
    </AuthMarketingShell>
  )
}
