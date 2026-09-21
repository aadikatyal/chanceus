import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import MatchHistoryTable from "@/components/matches/match-history-table"
import StatsCard from "@/components/dashboard/stats-card"
import { Trophy, Target, TrendingUp, Clock } from "lucide-react"

export default async function MatchesPage() {
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

  // Get match history with detailed information
  const { data: matches = [], error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      bet_amount,
      status,
      winner_id,
      started_at,
      completed_at,
      created_at,
      games (name),
      player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
      player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
    `)
    .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
    .order("created_at", { ascending: false })
    .limit(50)

  // Debug: Log any errors and the matches data
  if (matchesError) {
    console.error('❌ Error fetching matches:', matchesError)
  }
  
  console.log('🔍 Matches page - fetched matches:', matches?.length || 0)
  if (matches && matches.length > 0) {
    console.log('🔍 First match sample:', {
      id: matches[0].id,
      status: matches[0].status,
      player1: matches[0].player1,
      player2: matches[0].player2,
      games: matches[0].games
    })
  }

  // Calculate additional stats
  const completedMatches = matches.filter((m) => m.status === "completed")
  const totalWins = completedMatches.filter((m) => m.winner_id === authUser.id).length
  const totalLosses = completedMatches.filter((m) => m.winner_id && m.winner_id !== authUser.id).length
  const totalDraws = completedMatches.filter((m) => !m.winner_id).length

  const averageMatchDuration = completedMatches.length
    ? Math.round(
        completedMatches
          .filter((m) => m.started_at && m.completed_at)
          .reduce((sum, m) => {
            const duration = new Date(m.completed_at!).getTime() - new Date(m.started_at!).getTime()
            return sum + duration / 1000 / 60 // Convert to minutes
          }, 0) / completedMatches.length,
      )
    : 0

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />

      {/* Subtle gradient overlay */}
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Match History</h1>
          <p className="text-gray-400">Track your gaming performance and statistics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Wins"
            value={totalWins}
            description={`${totalLosses} losses, ${totalDraws} draws`}
            icon={Trophy}
            trend={{ value: 12, isPositive: true }}
            className="border-green-500/20"
          />
          <StatsCard
            title="Win Rate"
            value={`${user.win_rate}%`}
            description="Your success percentage"
            icon={Target}
            trend={{ value: 5, isPositive: true }}
            className="border-cyan-500/20"
          />
          <StatsCard
            title="Total Matches"
            value={user.total_games_played}
            description="Games completed"
            icon={TrendingUp}
            className="border-purple-500/20"
          />
          <StatsCard
            title="Avg Duration"
            value={`${averageMatchDuration}m`}
            description="Per completed match"
            icon={Clock}
            className="border-yellow-500/20"
          />
        </div>

        {/* Match History Table */}
        <MatchHistoryTable matches={matches} currentUserId={authUser.id} />
      </main>
    </div>
  )
}
