import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import {
  getTournament,
  getTournamentParticipants,
  getTournamentMatches,
} from "@/lib/tournament-actions"
import TournamentDetailClient from "@/components/tournaments/tournament-detail-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Coins, Calendar } from "lucide-react"

interface TournamentPageProps {
  params: Promise<{ tournamentId: string }>
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { tournamentId } = await params

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
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

  const tournament = await getTournament(tournamentId)
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Tournament not found</h1>
          <p className="text-gray-400">The tournament you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const participants = await getTournamentParticipants(tournamentId)
  const matches = await getTournamentMatches(tournamentId)

  // Check if user is registered
  const isRegistered = participants.some((p) => p.user_id === user.id)
  const participantCount = participants.length

  const statusColors: Record<string, string> = {
    registration: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    brackets_generated: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    in_progress: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />

      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Tournament Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
                <Badge
                  variant="outline"
                  className={statusColors[tournament.status] || statusColors.registration}
                >
                  {tournament.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-gray-400 mb-4">{tournament.description || "No description"}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Trophy className="h-4 w-4 text-orange-500" />
                  <span>{tournament.games?.name || "Game"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="h-4 w-4" />
                  <span>
                    {participantCount} / {tournament.max_participants} players
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span>{tournament.prize_pool.toLocaleString()} tokens prize pool</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Coins className="h-4 w-4" />
                  <span>{tournament.entry_fee} tokens entry fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Info Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">Prize Pool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                {tournament.prize_pool.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">Total tokens</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">Participants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                {participantCount}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                of {tournament.max_participants} max
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">Current Round</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {tournament.current_round === 0
                  ? "Registration"
                  : `${tournament.current_round} / ${tournament.total_rounds}`}
              </div>
              <p className="text-xs text-gray-400 mt-1">Tournament progress</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">Entry Fee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Coins className="h-5 w-5" />
                {tournament.entry_fee}
              </div>
              <p className="text-xs text-gray-400 mt-1">Tokens per player</p>
            </CardContent>
          </Card>
        </div>

        {/* Client Component for Interactive Features */}
        <TournamentDetailClient
          tournament={tournament}
          participants={participants}
          matches={matches}
          currentUser={user}
          isRegistered={isRegistered}
        />
      </main>
    </div>
  )
}

