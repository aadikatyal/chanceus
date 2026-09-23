import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { getAllTournaments } from "@/lib/tournament-actions"

export type PlatformLiveStats = {
  playersOnline: number
  matchesLive: number
  inQueue: number
  tournamentsLive: number
}

export const EMPTY_PLATFORM_LIVE_STATS: PlatformLiveStats = {
  playersOnline: 0,
  matchesLive: 0,
  inQueue: 0,
  tournamentsLive: 0,
}

export async function fetchPlatformLiveStats(): Promise<PlatformLiveStats> {
  if (!isSupabaseConfigured) {
    return EMPTY_PLATFORM_LIVE_STATS
  }

  const supabase = await createClient()
  const [{ count: playersOnline }, { count: matchesLive }, { count: inQueue }] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_online", true),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("matchmaking_queue").select("*", { count: "exact", head: true }).eq("status", "waiting"),
  ])

  let tournamentsLive = 0
  try {
    const tournaments = await getAllTournaments()
    tournamentsLive = tournaments.filter((t) => t.status === "in_progress").length
  } catch {
    tournamentsLive = 0
  }

  return {
    playersOnline: Math.max(0, playersOnline ?? 0),
    matchesLive: Math.max(0, matchesLive ?? 0),
    inQueue: Math.max(0, inQueue ?? 0),
    tournamentsLive: Math.max(0, tournamentsLive),
  }
}
