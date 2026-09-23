import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Target, Calendar, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { spendable } from "@/lib/wallet/server"

export default async function ProfilePage() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>
        
        <h1 className="text-2xl font-bold mb-4 text-white relative z-10">Connect Supabase to get started</h1>
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

  user.tokens = await spendable(authUser.id).catch(() => 0)

  // Get recent matches for achievements
  const { data: recentMatches = [] } = await supabase
    .from("matches")
    .select("status, winner_id, games(name)")
    .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10)

  const recentWins = recentMatches.filter((m) => m.winner_id === authUser.id).length
  const winStreak = recentMatches.reduce((streak, match, index) => {
    if (match.winner_id === authUser.id) {
      return index === 0 ? streak + 1 : streak
    }
    return 0
  }, 0)

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Profile Header */}
        <Card className="bg-gray-900/80 border-gray-800 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar_url || ""} alt={user.display_name || user.username} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-yellow-500 text-black font-semibold text-3xl">
                    {(user.display_name || user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-white">{user.display_name || user.username}</h1>
                  <p className="text-gray-400 text-lg">@{user.username}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400">
                      <Trophy className="mr-1 h-3 w-3" />
                      {user.total_games_won} Wins
                    </Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      <Target className="mr-1 h-3 w-3" />
                      {user.win_rate}% Win Rate
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      <Calendar className="mr-1 h-3 w-3" />
                      Since {new Date(user.created_at).getFullYear()}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="border-gray-700 text-gray-300 hover:text-white bg-transparent"
              >
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Stats */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Gaming Statistics</CardTitle>
                <CardDescription className="text-gray-400">Your performance across all games</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <div className="text-2xl font-bold text-white">{user.total_games_played}</div>
                    <div className="text-sm text-gray-400">Total Games</div>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{user.total_games_won}</div>
                    <div className="text-sm text-gray-400">Games Won</div>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-400">{user.tokens.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Tokens</div>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{winStreak}</div>
                    <div className="text-sm text-gray-400">Win Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription className="text-gray-400">Your latest gaming sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMatches.slice(0, 5).map((match, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">
                          {match.games?.name === "Math Blitz" && "🧮"}
                          {match.games?.name === "4 In a Row" && "🔴"}
                          {match.games?.name === "Trivia Challenge" && "🧠"}
                        </div>
                        <div>
                          <div className="text-white font-medium">{match.games?.name}</div>
                          <div className="text-sm text-gray-400">Recently completed</div>
                        </div>
                      </div>
                      <Badge
                        className={
                          match.winner_id === authUser.id
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {match.winner_id === authUser.id ? "Won" : "Lost"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <div className="space-y-6">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Achievements</CardTitle>
                <CardDescription className="text-gray-400">Your gaming milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="text-white font-medium">First Victory</div>
                      <div className="text-sm text-gray-400">Won your first match</div>
                    </div>
                  </div>
                  {user.total_games_won >= 10 && (
                    <div className="flex items-center space-x-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <div className="text-2xl">⭐</div>
                      <div>
                        <div className="text-white font-medium">Rising Star</div>
                        <div className="text-sm text-gray-400">Won 10 matches</div>
                      </div>
                    </div>
                  )}
                  {winStreak >= 3 && (
                    <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="text-2xl">🔥</div>
                      <div>
                        <div className="text-white font-medium">On Fire</div>
                        <div className="text-sm text-gray-400">{winStreak} win streak</div>
                      </div>
                    </div>
                  )}
                  {user.tokens >= 1000 && (
                    <div className="flex items-center space-x-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="text-2xl">💎</div>
                      <div>
                        <div className="text-white font-medium">Token Master</div>
                        <div className="text-sm text-gray-400">Earned 1000+ tokens</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
