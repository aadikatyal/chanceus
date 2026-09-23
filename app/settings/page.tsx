import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import FeaturePageHeader from "@/components/app/feature-page-header"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import ProfileSettings from "@/components/settings/profile-settings"
import PreferencesSettings from "@/components/settings/preferences-settings"
import { ChanceText } from "@/components/design-system/typography"

export default async function SettingsPage() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <div className="max-w-md text-center">
          <ChanceText as="h1" variant="h2" className="mb-3">
            Connect Supabase to get started
          </ChanceText>
          <ChanceText variant="muted">Configure your database connection to continue</ChanceText>
        </div>
      </div>
    )
  }

  // Get the user from the server
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!authUser) {
    redirect("/auth/login")
  }

  // Get user profile data
  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <CompetitiveShell user={user}>
      <CompetitivePageFeed>
        <FeaturePageHeader
          kicker="Account"
          title="Settings"
          description="Manage your profile and preferences"
        />
        <div className="space-y-6">
          <ProfileSettings user={user} />
          <PreferencesSettings />
        </div>
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
