import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { User } from "@/lib/supabase/client"
import VenuesHubClient from "@/components/venues/venues-hub-client"
import { ChanceText } from "@/components/design-system/typography"

function userFromAuth(authUser: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
  created_at: string
  updated_at?: string
}): User {
  return {
    id: authUser.id,
    username: (authUser.user_metadata?.username as string) || authUser.email?.split("@")[0] || "user",
    email: authUser.email || "",
    display_name:
      (authUser.user_metadata?.display_name as string) ||
      (authUser.user_metadata?.full_name as string) ||
      authUser.email?.split("@")[0] ||
      "User",
    avatar_url: (authUser.user_metadata?.avatar_url as string) || null,
    tokens: 0,
    total_games_played: 0,
    total_games_won: 0,
    win_rate: 0,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at || authUser.created_at,
  }
}

export default async function BarsPage() {
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

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: userRow } = await supabase.from("users").select("*").eq("id", authUser.id).single()
  const user = userRow ?? userFromAuth(authUser)

  return <VenuesHubClient user={user} />
}
