import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import GameCard from "@/components/games/game-card"
import MatchList from "@/components/games/match-list"
import MatchmakingRealtime from "@/components/matchmaking-realtime"
import MyMatchmakingQueues from "@/components/my-matchmaking-queues"
import CleanupHandler from "@/components/cleanup-handler"
import GamesPageClient from "@/components/games-page-client"
import FriendsOnline from "@/components/dashboard/friends-online"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { forceCompleteMatches } from "@/lib/force-complete-matches"

export default async function GamesPage() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
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

  // Note: Cleanup is handled by the debug page and client-side actions
  // to avoid revalidatePath issues during server-side rendering

  // Get all active games
  const { data: games = [] } = await supabase.from("games").select("*").eq("is_active", true).order("name")
  
  console.log("🎮 Games loaded:", games.map(g => ({ id: g.id, name: g.name })))

  // Get waiting matches with user info - show ALL waiting matches including user's own
  // Exclude matches that have both players (they should be completed)
  const { data: waitingMatches = [] } = await supabase
    .from("matches")
    .select(
      `
      id,
      bet_amount,
      created_at,
      player1_id,
      player2_id,
      games (name),
      player1:users!matches_player1_id_fkey (username, display_name, avatar_url)
    `,
    )
    .eq("status", "waiting")
    .is("player2_id", null) // Only show matches waiting for a second player
    .neq("player1_id", authUser.id) // Exclude user's own matches
    .order("created_at", { ascending: false })
    .limit(10)

  // Get user's own matches that can be cancelled (waiting or in_progress)
  const { data: myCancellableMatches = [] } = await supabase
    .from("matches")
    .select(
      `
      id,
      bet_amount,
      created_at,
      player1_id,
      player2_id,
      status,
      games (name),
      player1:users!matches_player1_id_fkey (username, display_name, avatar_url),
      player2:users!matches_player2_id_fkey (username, display_name, avatar_url)
    `,
    )
    .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: false })

  // Debug: Get ALL waiting matches to see what exists
  const { data: allWaitingMatches = [] } = await supabase
    .from("matches")
    .select(
      `
      id,
      bet_amount,
      created_at,
      player1_id,
      games (name),
      player1:users!matches_player1_id_fkey (username, display_name, avatar_url)
    `,
    )
    .eq("status", "waiting")
    .is("player2_id", null)
    .neq("player1_id", authUser.id) // Don't show user's own matches here
    .order("created_at", { ascending: false })

  // Debug: Let's also check what matches exist in the database
  const { data: allMatches = [] } = await supabase
    .from("matches")
    .select(`
      id,
      bet_amount,
      created_at,
      player1_id,
      player2_id,
      status,
      games (name),
      player1:users!matches_player1_id_fkey (username, display_name)
    `)
    .eq("status", "waiting")
    .order("created_at", { ascending: false })

  console.log("🔍 Debug - Open matches query:", {
    currentUserId: authUser.id,
    waitingMatchesCount: waitingMatches.length,
    allMatchesCount: allMatches.length,
    waitingMatches: waitingMatches.map(m => ({
      id: m.id,
      player1_id: m.player1_id,
      player1_username: m.player1?.username,
      bet_amount: m.bet_amount,
      game: m.games?.name
    })),
    allMatches: allMatches.map(m => ({
      id: m.id,
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      player1_username: m.player1?.username,
      bet_amount: m.bet_amount,
      game: m.games?.name,
      status: m.status,
      isOwnMatch: m.player1_id === authUser.id
    }))
  })

  // Get active matchmaking queue entries that other players can join
  const { data: matchmakingQueues = [] } = await supabase
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
    `,
    )
    .eq("status", "waiting")
    .neq("user_id", authUser.id) // Don't show user's own queue entries
    .gt("expires_at", new Date().toISOString()) // Only show non-expired entries
    .order("created_at", { ascending: false })
    .limit(10)

  // Get user's own matchmaking queues
  const { data: myMatchmakingQueues = [] } = await supabase
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
    `,
    )
    .eq("status", "waiting")
    .eq("user_id", authUser.id) // Only show user's own queue entries
    .gt("expires_at", new Date().toISOString()) // Only show non-expired entries
    .order("created_at", { ascending: false })
    .limit(5)


  // Debug: Get ALL matches to see what's in the database
  const { data: allMatchesDebug = [] } = await supabase
    .from("matches")
    .select(`
      id,
      status,
      bet_amount,
      created_at,
      completed_at,
      player1_id,
      player2_id,
      games (name)
    `)
    .order("created_at", { ascending: false })
    .limit(20)

  console.log('🔍 Debug - ALL matches in database:', {
    totalMatches: allMatchesDebug.length,
    matches: allMatchesDebug.map(m => ({ 
      id: m.id, 
      status: m.status, 
      game: m.games?.name, 
      bet: m.bet_amount, 
      created: m.created_at,
      completed: m.completed_at,
      p1: m.player1_id,
      p2: m.player2_id
    }))
  })

  console.log('🔍 Debug - Available matches for joining:', {
    totalWaiting: waitingMatches.length,
    matches: waitingMatches.map(m => ({ 
      id: m.id, 
      game: m.games?.name, 
      bet: m.bet_amount, 
      creator: m.player1?.username,
      player1Data: m.player1,
      player1Id: m.player1_id
    }))
  })

  // Check if there are any matches that should be completed but aren't
  const completedMatches = allMatchesDebug.filter(m => m.status === 'completed')
  const waitingMatchesWithBothPlayers = allMatchesDebug.filter(m => 
    m.status === 'waiting' && m.player1_id && m.player2_id
  )

  console.log('🔍 Debug - Match status analysis:', {
    totalMatches: allMatchesDebug.length,
    completedMatches: completedMatches.length,
    waitingMatchesWithBothPlayers: waitingMatchesWithBothPlayers.length,
    shouldBeCompleted: waitingMatchesWithBothPlayers.map(m => ({
      id: m.id,
      game: m.games?.name,
      p1: m.player1_id,
      p2: m.player2_id,
      created: m.created_at
    }))
  })

  // Force complete any matches that should be completed
  if (waitingMatchesWithBothPlayers.length > 0) {
    console.log('⚠️ Found matches that should be completed, force completing...')
    await forceCompleteMatches()
  }

  console.log('🔍 Debug - Matchmaking queues:', {
    totalQueues: matchmakingQueues.length,
    queues: matchmakingQueues.map(q => ({ 
      id: q.id, 
      game: q.games?.name, 
      bet: q.bet_amount, 
      type: q.match_type,
      user: q.users?.username || 'Unknown',
      userData: q.users,
      expires: q.expires_at
    }))
  })


  // Get user's own waiting matches
  const { data: myWaitingMatches = [] } = await supabase
    .from("matches")
    .select(
      `
      id,
      bet_amount,
      created_at,
      games (name),
      player1:users!matches_player1_id_fkey (username, display_name, avatar_url)
    `,
    )
    .eq("status", "waiting")
    .eq("player1_id", authUser.id)
    .is("player2_id", null)
    .order("created_at", { ascending: false })
    .limit(5)

  console.log('🔍 Debug - User\'s own waiting matches:', {
    totalMyWaiting: myWaitingMatches.length,
    matches: myWaitingMatches.map(m => ({ id: m.id, game: m.games?.name, bet: m.bet_amount }))
  })

  // Get active match counts per game
  const { data: matchCounts = [] } = await supabase
    .from("matches")
    .select("game_id")
    .in("status", ["waiting", "in_progress"])

  const gameMatchCounts = matchCounts.reduce(
    (acc, match) => {
      acc[match.game_id] = (acc[match.game_id] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <CleanupHandler />
      <Header user={user} />
      <GamesPageClient userId={user.id} />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Games Lobby</h1>
              <p className="text-gray-400 text-sm sm:text-lg">Choose your game and test your skills against other players</p>
            </div>
            <div className="flex items-center sm:ml-4">
              <FriendsOnline />
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Available Games</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                activeMatches={gameMatchCounts[game.id] || 0}
                onlineUsers={Math.max(10, (gameMatchCounts[game.id] || 0) * 2 + 15)} // Based on active matches
              />
            ))}
          </div>
        </div>


        {/* Debug Section - Remove in production */}
        {waitingMatchesWithBothPlayers.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <h3 className="text-yellow-300 font-bold mb-2">⚠️ Debug: Found {waitingMatchesWithBothPlayers.length} matches that should be completed</h3>
            <p className="text-yellow-200 text-sm mb-3">
              These matches have both players but are still showing as "waiting". 
              They should be automatically completed on page refresh.
            </p>
            <div className="text-xs text-yellow-300">
              {waitingMatchesWithBothPlayers.map(m => (
                <div key={m.id}>
                  Match {m.id.slice(0, 8)}... - {m.games?.name} - Created: {new Date(m.created_at).toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Matches */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* All Available Matches */}
          <div className="bg-gray-900/80 border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Available Matches</h3>
            <p className="text-gray-400 text-sm mb-4">Join existing matches or find opponents</p>
            
            <div className="space-y-4">
              {/* My Active Matches */}
              {myCancellableMatches.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">My Active Matches</h4>
                  <MatchList
                    matches={myCancellableMatches}
                    currentUserId={user.id}
                    title=""
                    description=""
                  />
                </div>
              )}

              {/* My Active Matchmaking */}
              <MyMatchmakingQueues queues={myMatchmakingQueues} />
              
              {/* Waiting Matches */}
              {waitingMatches.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Open Matches</h4>
                  <MatchList
                    matches={waitingMatches}
                    currentUserId={user.id}
                    title=""
                    description=""
                  />
                </div>
              )}
              
              {/* Matchmaking Queues */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Players Searching</h4>
                <MatchmakingRealtime initialQueues={matchmakingQueues} currentUserId={user.id} />
              </div>
              
              {/* No matches message */}
              {waitingMatches.length === 0 && matchmakingQueues.length === 0 && myMatchmakingQueues.length === 0 && myCancellableMatches.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No matches available</div>
                  <div className="text-gray-500 text-sm">Create a new match to get started!</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-900/80 border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Lobby Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Players Online</span>
                <div className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="font-semibold">1,247</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Matches</span>
                <span className="text-white font-semibold">
                  {Object.values(gameMatchCounts).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Waiting Matches</span>
                <span className="text-yellow-400 font-semibold">{waitingMatches.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Prize Pool</span>
                <span className="text-cyan-400 font-semibold">
                  {waitingMatches.reduce((sum, match) => sum + match.bet_amount * 2, 0).toLocaleString()} tokens
                </span>
              </div>
            </div>

            {/* Recent Winners */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <h4 className="text-white font-medium mb-3">Recent Winners</h4>
              <div className="space-y-2">
                {["MathWizard", "ConnectPro", "TriviaKing"].map((winner, index) => (
                  <div key={winner} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">@{winner}</span>
                    <span className="text-green-400 font-medium">+{(index + 1) * 50} tokens</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
      <CleanupHandler />
    </div>
  )
}
