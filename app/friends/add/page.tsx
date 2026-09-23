import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import PlayerDiscoveryPage from "@/components/social/discovery/player-discovery-page"
import { ChanceText } from "@/components/design-system/typography"

export default async function AddFriendsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <ChanceText as="h1" variant="h2">
          Connect Supabase to get started
        </ChanceText>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect("/auth/login")

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()
  if (!user) redirect("/auth/login")

  return (
    <CompetitiveShell user={user}>
      <CompetitivePageFeed className="chance-home-feed chance-home-feed--hero-first chance-discovery-feed">
        <PlayerDiscoveryPage />
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
