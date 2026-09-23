import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"
import AuthMarketingShell from "@/components/app/auth-marketing-shell"
import { ChanceText } from "@/components/design-system/typography"
import { fetchPlatformLiveStats } from "@/lib/platform-live-stats"
import { safeAppPath } from "@/lib/safe-redirect"

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  console.log("🔍 DEBUG: Login page loaded with searchParams:", params)
  
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
    if (profile) {
      redirect(safeAppPath(params.redirect))
    }
  }

  const live = await fetchPlatformLiveStats()

  return (
    <AuthMarketingShell variant="login" live={live}>
      <LoginForm redirectUrl={params.redirect} />
    </AuthMarketingShell>
  )
}
