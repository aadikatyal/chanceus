import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import LiveMatchesList from "@/components/games/live-matches-list"

export default async function WatchPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile data for header
  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  const displayUser = userProfile || {
    id: user.id,
    username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
    email: user.email || "",
    display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    avatar_url: user.user_metadata?.avatar_url || null,
    tokens: 1000,
    total_games_played: 0,
    total_games_won: 0,
    win_rate: 0,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  }

  // Get ONLY active matches (waiting or in_progress) - exclude completed
  const { data: allPotentialMatches = [] } = await supabase
    .from("matches")
    .select(
      `
      id,
      bet_amount,
      status,
      started_at,
      created_at,
      player1_id,
      player2_id,
      games (id, name),
      player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
      player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
    `
    )
    .in("status", ["waiting", "in_progress"]) // Only active matches, not completed
    .order("created_at", { ascending: false })
    .limit(100)

  // Also check ALL matches regardless of status to see what's actually in DB
  const { data: allMatchesAnyStatus = [] } = await supabase
    .from("matches")
    .select("id, status, player1_id, player2_id, created_at, started_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(10)

  console.log("🔍 DEBUG - All ACTIVE matches (waiting/in_progress only):", {
    total: allPotentialMatches?.length || 0,
    matches: allPotentialMatches?.slice(0, 10).map((m) => ({
      id: m.id,
      status: m.status,
      player1: m.player1_id,
      player2: m.player2_id,
      hasPlayer2: !!m.player2_id,
      isUserPlayer1: m.player1_id === user.id,
      isUserPlayer2: m.player2_id === user.id,
      isUserInMatch: m.player1_id === user.id || m.player2_id === user.id,
    })),
    currentUserId: user.id,
    // Show matches where user is NOT a player
    matchesUserNotIn: allPotentialMatches?.filter(
      (m) => m.player1_id !== user.id && m.player2_id !== user.id
    ).map((m) => ({
      id: m.id,
      status: m.status,
      player1: m.player1_id,
      player2: m.player2_id,
    })),
  })

  console.log("🔍 DEBUG - ALL matches in DB (any status, last 10):", {
    total: allMatchesAnyStatus?.length || 0,
    matches: allMatchesAnyStatus?.map((m) => ({
      id: m.id,
      status: m.status,
      player1: m.player1_id,
      player2: m.player2_id,
      created: m.created_at,
      started: m.started_at,
      completed: m.completed_at,
      isUserPlayer1: m.player1_id === user.id,
      isUserPlayer2: m.player2_id === user.id,
    })),
  })

  // Filter to only show matches that:
  // 1. Have both players (player2_id is not null)
  // 2. User is NOT a player
  // 3. Status is "waiting" or "in_progress" (exclude completed)
  const watchableMatches = (allPotentialMatches || []).filter((m) => {
    const hasBothPlayers = m.player2_id !== null && m.player2_id !== undefined
    const userIsNotPlayer = m.player1_id !== user.id && m.player2_id !== user.id
    const isActive = m.status === "waiting" || m.status === "in_progress"
    
    return hasBothPlayers && userIsNotPlayer && isActive
  })

  console.log("🔍 DEBUG - After filtering:", {
    watchable: watchableMatches.length,
    filtered: watchableMatches.slice(0, 3).map((m) => ({
      id: m.id,
      status: m.status,
      player1: m.player1_id,
      player2: m.player2_id,
    })),
  })

  // Separate into live (in_progress) and starting soon (waiting)
  const liveMatches = watchableMatches.filter((m) => m.status === "in_progress")
  const startingMatches = watchableMatches.filter((m) => m.status === "waiting")

  // Debug logging
  console.log("🔍 Watch page - Found matches:", {
    inProgress: liveMatches.length,
    waiting: startingMatches.length,
    userId: user.id,
    sampleMatch: liveMatches[0] || startingMatches[0] || null,
  })

  return (
    <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] chance-competitive-theme">
      <Header user={displayUser} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="chance-hero-title text-2xl sm:text-3xl mb-2">Watch Live Matches</h1>
          <p className="text-gray-400">
            Spectate ongoing matches and watch players compete in real-time
          </p>
        </div>

        <div className="space-y-6">
          {/* Live Matches */}
          <LiveMatchesList
            matches={liveMatches}
            title="Live Now"
            description="Matches currently in progress"
            currentUserId={user.id}
          />

          {/* Starting Soon */}
          {startingMatches.length > 0 && (
            <LiveMatchesList
              matches={startingMatches}
              title="Starting Soon"
              description="Matches about to begin"
              currentUserId={user.id}
            />
          )}

          {/* Empty State */}
          {liveMatches.length === 0 && startingMatches.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">👀</div>
              <h2 className="text-2xl font-bold text-white mb-2">No Live Matches</h2>
              <p className="text-gray-400 mb-6">
                There are no active matches to spectate right now.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 max-w-md mx-auto mb-4">
                <p className="text-blue-400 text-sm">
                  <strong>Tip:</strong> To test spectator mode, you need to use <strong>different accounts</strong> on different devices. 
                  If you're using the same account, you're a player (not a spectator), so the match won't appear here.
                </p>
              </div>
              <p className="text-gray-500 text-sm">
                Check back soon or create a match to get started!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

