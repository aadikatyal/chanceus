import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import GameQueueHub from "@/components/queue/game-queue-hub"
import GameQueueRail from "@/components/queue/game-queue-rail"
import { ChanceText } from "@/components/design-system/typography"
import { buildGameLiveStats } from "@/lib/games/play-catalog"
import type { PlayLobbyMatch } from "@/components/play/play-types"

interface GameLobbyPageProps {
  params: Promise<{ gameId: string }>
}

export default async function GameLobbyPage({ params }: GameLobbyPageProps) {
  const { gameId } = await params

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

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("is_active", true)
    .single()

  if (!game) {
    notFound()
  }

  const nowIso = new Date().toISOString()

  const [{ data: matchRows = [] }, { data: queueRows = [] }, { data: waitingMatches = [] }] =
    await Promise.all([
      supabase.from("matches").select("game_id, status").eq("game_id", gameId).in("status", ["waiting", "in_progress"]),
      supabase
        .from("matchmaking_queue")
        .select("game_id")
        .eq("game_id", gameId)
        .eq("status", "waiting")
        .gt("expires_at", nowIso),
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
        .eq("game_id", gameId)
        .eq("status", "waiting")
        .is("player2_id", null)
        .neq("player1_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ])

  const queueByGame = { [gameId]: queueRows?.length ?? 0 }
  const statsByGame = buildGameLiveStats([gameId], queueByGame, matchRows ?? [])
  const stats = statsByGame[gameId]

  const rail = (
    <GameQueueRail gameId={gameId} waitingMatches={(waitingMatches ?? []) as PlayLobbyMatch[]} />
  )

  return (
    <CompetitiveShell user={user} rail={rail}>
      <Suspense
        fallback={
          <div className="chance-premium-card animate-pulse p-8">
            <div className="h-8 w-48 rounded bg-[var(--chance-muted)]" />
          </div>
        }
      >
        <GameQueueHub
          game={game}
          userId={user.id}
          tokens={user.tokens ?? 0}
          stats={stats}
          queueCount={queueRows?.length ?? 0}
          openLobbies={waitingMatches?.length ?? 0}
        />
      </Suspense>
    </CompetitiveShell>
  )
}
