import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import { getAllTournaments } from "@/lib/tournament-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Calendar, Coins, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import TournamentPasswordGate from "@/components/tournaments/tournament-password-gate"

export default async function TournamentsPage() {
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

  const tournaments = await getAllTournaments()

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />

      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <TournamentPasswordGate>
          <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
              <p className="text-gray-400">Compete in skill-based tournaments (power of 2 players, up to 512)</p>
            </div>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/tournaments/create">Create Tournament</Link>
            </Button>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No tournaments yet</h3>
                <p className="text-gray-400 mb-6">Be the first to create a tournament!</p>
                <Button asChild className="bg-orange-500 hover:bg-orange-600">
                  <Link href="/tournaments/create">Create Tournament</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => {
              const statusColors: Record<string, string> = {
                registration: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                brackets_generated: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                in_progress: "bg-green-500/20 text-green-400 border-green-500/30",
                completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
              }

              return (
                <Card
                  key={tournament.id}
                  className="bg-gray-900/80 border-gray-800 card-hover group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-xl mb-2">{tournament.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {tournament.games?.name || "Game"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusColors[tournament.status] || statusColors.registration}
                      >
                        {tournament.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">Prize Pool</p>
                        <p className="text-white font-semibold flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-400" />
                          {tournament.prize_pool.toLocaleString()} tokens
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Entry Fee</p>
                        <p className="text-white font-semibold">{tournament.entry_fee} tokens</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Max Players</p>
                        <p className="text-white font-semibold flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {tournament.max_participants}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Current Round</p>
                        <p className="text-white font-semibold">
                          {tournament.current_round === 0
                            ? "Registration"
                            : `Round ${tournament.current_round}/${tournament.total_rounds}`}
                        </p>
                      </div>
                    </div>

                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-semibold"
                    >
                      <Link href={`/tournaments/${tournament.id}`}>
                        View Tournament
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        </TournamentPasswordGate>
      </main>
    </div>
  )
}

