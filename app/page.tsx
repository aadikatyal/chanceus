import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LandingPageClient, { type LandingGame, type LandingStats } from "@/components/landing/landing-page-client"
import "./chance-landing.css"

export default async function Home() {
  if (!isSupabaseConfigured) {
    return (
      <div className="dark chance-competitive-theme flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <h1 className="text-xl font-semibold text-[var(--chance-fg)]">Connect Supabase to get started</h1>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (authUser) {
    const { data: userProfile } = await supabase.from("users").select("id").eq("id", authUser.id).single()
    if (userProfile) redirect("/dashboard")
  }

  const [{ data: gamesRaw }, { count: playerCount }, { count: matchCount }, { count: completedCount }] = await Promise.all([
    supabase.from("games").select("id, name, description, min_bet, max_bet").order("name"),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ])

  const { data: liveMatches } = await supabase.from("matches").select("game_id").eq("status", "in_progress")

  const liveByGame = new Map<string, number>()
  for (const m of liveMatches ?? []) {
    if (!m.game_id) continue
    liveByGame.set(m.game_id as string, (liveByGame.get(m.game_id as string) ?? 0) + 1)
  }

  const games: LandingGame[] = (gamesRaw ?? []).slice(0, 6).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    description: (g.description as string | null) ?? null,
    min_bet: Number(g.min_bet) || 0,
    max_bet: Number(g.max_bet) || 0,
    playersLive: liveByGame.get(g.id as string) ?? 0,
  }))

  const fallbackGames: LandingGame[] = [
    {
      id: "69bf26d2-110b-40d9-b20a-d5cfab14d133",
      name: "Four in a Row",
      description: "Classic grid strategy. Connect four before they do.",
      min_bet: 25,
      max_bet: 1000,
      playersLive: 0,
    },
    {
      id: "d0c5fda9-ec91-46b4-be62-cba48b398168",
      name: "Math Blitz",
      description: "Speed arithmetic under pressure.",
      min_bet: 10,
      max_bet: 500,
      playersLive: 0,
    },
    {
      id: "e03ee060-b913-4795-9149-54660e2e2eac",
      name: "Trivia Challenge",
      description: "Category knowledge, head-to-head.",
      min_bet: 15,
      max_bet: 750,
      playersLive: 0,
    },
  ]

  const { data: tokenSum } = await supabase.from("matches").select("bet_amount").eq("status", "completed").limit(500)

  let tokensWon = 0
  for (const row of tokenSum ?? []) {
    tokensWon += (Number(row.bet_amount) || 0) * 2
  }

  const stats: LandingStats = {
    activePlayers: Math.max(playerCount ?? 0, 1),
    matchesPlayed: matchCount ?? 0,
    tokensWon: tokensWon || 10000,
    gamesCompleted: completedCount ?? 0,
  }

  return <LandingPageClient games={games.length > 0 ? games : fallbackGames} stats={stats} />
}
