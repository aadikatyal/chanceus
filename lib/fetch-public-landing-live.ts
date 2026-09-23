import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { fetchLandingPlatformAggregates } from "@/lib/fetch-landing-platform-stats"
import { buildLandingLiveMetrics, EMPTY_LANDING_LIVE_METRICS, type LandingLiveMetrics } from "@/lib/landing-live-metrics"
import { getAllTournaments } from "@/lib/tournament-actions"

/** Same showcase + realtime fields as the public home hero (`LandingLiveArena`). */
export async function fetchPublicLandingLive(): Promise<LandingLiveMetrics> {
  if (!isSupabaseConfigured) {
    return EMPTY_LANDING_LIVE_METRICS
  }

  const supabase = await createClient()
  const [{ count: playersOnline }, { count: matchesLive }, { count: matchesDecided }] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_online", true),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ])

  const platform = await fetchLandingPlatformAggregates(matchesDecided ?? 0)

  let tournamentsLive = 0
  try {
    const tournaments = await getAllTournaments()
    tournamentsLive = tournaments.filter((t) => t.status === "in_progress").length
  } catch {
    tournamentsLive = 0
  }

  return buildLandingLiveMetrics({
    gamesPlayed: platform.gamesPlayed,
    tokensInPlay: platform.tokensInCirculation,
    moneyMadeUsd: platform.moneyMadeUsd,
    playersOnline: playersOnline ?? 0,
    matchesLive: matchesLive ?? 0,
    inQueue: platform.inQueue,
    openLobbies: platform.openLobbies,
    registeredPlayers: platform.registeredPlayers,
    openTournaments: platform.openTournaments,
    playersInArena: 0,
    tournamentsLive,
    matchesDecided: matchesDecided ?? 0,
    tokensEarned: 0,
  })
}
