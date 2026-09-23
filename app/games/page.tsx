import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import CleanupHandler from "@/components/cleanup-handler"
import GamesPageClient from "@/components/games-page-client"
import PlayPageClient from "@/components/play/play-page-client"
import PlayRail from "@/components/play/play-rail"
import PlayOpenLobbies from "@/components/play/play-open-lobbies"
import { ChanceText } from "@/components/design-system/typography"
import { getAllTournaments } from "@/lib/tournament-actions"
import {
  buildGameLiveStats,
  pickFeaturedGameId,
} from "@/lib/games/play-catalog"
import type { FriendPlaying, PlayLobbyMatch, PlayMyQueue } from "@/components/play/play-types"
import { forceCompleteMatches } from "@/lib/force-complete-matches"

export default async function GamesPage() {
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

  const nowIso = new Date().toISOString()

  const [
    { data: games = [] },
    { data: waitingMatches = [] },
    { data: myMatchmakingQueues = [] },
    { data: matchmakingQueues = [] },
    { data: matchRows = [] },
    { data: queueRows = [] },
    { data: friendships = [] },
    tournaments,
  ] = await Promise.all([
    supabase.from("games").select("*").eq("is_active", true).order("name"),
    supabase
      .from("matches")
      .select(
        `
        id,
        bet_amount,
        created_at,
        player1_id,
        games (name),
        player1:users!matches_player1_id_fkey (username, display_name, avatar_url)
      `
      )
      .eq("status", "waiting")
      .is("player2_id", null)
      .neq("player1_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("matchmaking_queue")
      .select(
        `
        id,
        game_id,
        bet_amount,
        match_type,
        expires_at,
        created_at,
        games (name)
      `
      )
      .eq("status", "waiting")
      .eq("user_id", authUser.id)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("matchmaking_queue")
      .select(
        `
        id,
        game_id,
        bet_amount,
        match_type,
        expires_at,
        created_at,
        user_id,
        games (name),
        users!matchmaking_queue_user_id_fkey (username, display_name, avatar_url)
      `
      )
      .eq("status", "waiting")
      .neq("user_id", authUser.id)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("matches").select("game_id, status").in("status", ["waiting", "in_progress"]),
    supabase
      .from("matchmaking_queue")
      .select("game_id")
      .eq("status", "waiting")
      .gt("expires_at", nowIso),
    supabase
      .from("friends")
      .select("user_id, friend_id")
      .eq("status", "accepted")
      .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`),
    getAllTournaments(),
  ])

  const { data: stuckMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "waiting")
    .not("player2_id", "is", null)
    .limit(1)
  if (stuckMatches && stuckMatches.length > 0) {
    await forceCompleteMatches()
  }

  const gameIds = games.map((g) => g.id)
  const queueByGame = (queueRows ?? []).reduce(
    (acc, row) => {
      acc[row.game_id] = (acc[row.game_id] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const statsByGame = buildGameLiveStats(gameIds, queueByGame, matchRows ?? [])
  const featuredGameId = pickFeaturedGameId(games, statsByGame)
  const totalInQueue = (queueRows ?? []).length
  const totalLive = Object.values(statsByGame).reduce((sum, s) => sum + s.playersLive, 0)

  const friendIds = (friendships ?? [])
    .map((f) => (f.user_id === authUser.id ? f.friend_id : f.user_id))
    .filter(Boolean) as string[]

  let friendsPlaying: FriendPlaying[] = []
  if (friendIds.length > 0) {
    const { data: friendMatches } = await supabase
      .from("matches")
      .select(
        `
        id,
        player1_id,
        player2_id,
        games (name),
        player1:users!matches_player1_id_fkey (id, username, display_name),
        player2:users!matches_player2_id_fkey (id, username, display_name)
      `
      )
      .eq("status", "in_progress")
      .or(`player1_id.in.(${friendIds.join(",")}),player2_id.in.(${friendIds.join(",")})`)
      .limit(8)

    friendsPlaying = (friendMatches ?? []).flatMap((m) => {
      const rows: FriendPlaying[] = []
      const gameName = (m.games as { name?: string } | null)?.name ?? "Game"
      const p1 = m.player1 as { id: string; username: string; display_name?: string } | null
      const p2 = m.player2 as { id: string; username: string; display_name?: string } | null
      if (p1 && friendIds.includes(p1.id)) {
        rows.push({
          userId: p1.id,
          displayName: p1.display_name || p1.username,
          username: p1.username,
          gameName,
          matchId: m.id,
        })
      }
      if (p2 && friendIds.includes(p2.id)) {
        rows.push({
          userId: p2.id,
          displayName: p2.display_name || p2.username,
          username: p2.username,
          gameName,
          matchId: m.id,
        })
      }
      return rows
    })
  }

  const rail = (
    <PlayRail
      userId={user.id}
      myQueues={(myMatchmakingQueues ?? []) as PlayMyQueue[]}
      matchmakingQueues={matchmakingQueues ?? []}
      friendsPlaying={friendsPlaying}
      tournaments={tournaments}
    />
  )

  return (
    <CompetitiveShell user={user} rail={rail}>
      <CleanupHandler />
      <GamesPageClient userId={user.id} />

      <PlayPageClient
        games={games}
        statsByGame={statsByGame}
        featuredGameId={featuredGameId}
        totalLive={totalLive}
        totalInQueue={totalInQueue}
      />

      <div className="mx-auto mt-8 w-full max-w-none pb-4">
        <PlayOpenLobbies matches={(waitingMatches ?? []) as PlayLobbyMatch[]} />
      </div>
    </CompetitiveShell>
  )
}
