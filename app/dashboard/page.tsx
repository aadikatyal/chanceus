import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RecentMatches from "@/components/dashboard/recent-matches"
import DashboardClient from "@/components/dashboard/dashboard-client"
import HomeActiveMatchBanner from "@/components/dashboard/home-active-match-banner"
import HomeHero from "@/components/dashboard/home-hero"
import FeaturedGames from "@/components/dashboard/featured-games"
import HomeRail from "@/components/dashboard/home-rail"
import CompetitiveShell from "@/components/app/competitive-shell"
import { ChanceText } from "@/components/design-system/typography"

export default async function DashboardPage() {
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

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  const displayName = user.display_name || user.username
  const wins = user.total_games_won ?? 0
  const losses = Math.max(0, (user.total_games_played ?? 0) - wins)

  const { data: games = [] } = await supabase
    .from("games")
    .select("id, name, min_bet, max_bet")
    .eq("is_active", true)
    .order("name")

  const { data: activeMatch } = await supabase
    .from("matches")
    .select("id, status, games (name)")
    .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const activeGameName =
    activeMatch?.games && typeof activeMatch.games === "object" && "name" in activeMatch.games
      ? String((activeMatch.games as { name: string }).name)
      : "Match"

  const rail = <HomeRail userId={user.id} tokens={user.tokens ?? 0} />

  return (
    <CompetitiveShell user={user} rail={rail}>
      <DashboardClient />

      <div className="chance-home-feed chance-home-feed--hero-first mx-auto w-full max-w-none xl:max-w-[calc(100%-1rem)]">
        <HomeHero displayName={displayName} wins={wins} losses={losses} />

        {activeMatch && (activeMatch.status === "waiting" || activeMatch.status === "in_progress") ? (
          <HomeActiveMatchBanner
            matchId={activeMatch.id}
            status={activeMatch.status}
            gameName={activeGameName}
          />
        ) : null}

        <FeaturedGames games={games ?? []} />

        <div className="chance-premium-card p-5 sm:p-[1.375rem]">
          <RecentMatches />
        </div>
      </div>
    </CompetitiveShell>
  )
}
