"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { BarTriviaSession, BarTriviaParticipant, Bar } from "@/lib/bar-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Clock, RefreshCw, CheckCircle } from "lucide-react"
import Header from "@/components/navigation/header"
import type { User } from "@/lib/supabase/client"
import { getCompleteUserData } from "@/lib/user-utils"

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionCode = params.sessionCode as string
  
  const [session, setSession] = useState<BarTriviaSession | null>(null)
  const [participants, setParticipants] = useState<BarTriviaParticipant[]>([])
  const [bar, setBar] = useState<Bar | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionCode) return
      
      console.log("🔍 DEBUG: Session page loading with sessionCode:", sessionCode)
      setIsLoading(true)
      setError("")
      
      try {
        const supabase = createClient()
        
        // Get complete user data using utility function
        const userData = await getCompleteUserData()
        console.log("🔍 DEBUG: Session page user data:", userData)
        setUser(userData)
        
        // Get session by session code
        console.log("🔍 DEBUG: Searching for session with code:", sessionCode)
        const { data: sessionData, error: sessionError } = await supabase
          .from("bar_trivia_sessions")
          .select(`
            *,
            bar_trivia_games!inner(
              bar_id,
              bars!inner(*)
            )
          `)
          .eq("session_code", sessionCode)
          .single()

        console.log("🔍 DEBUG: Session query result:", { sessionData, sessionError })

        if (sessionError || !sessionData) {
          console.log("🔍 DEBUG: Session not found, error:", sessionError)
          setError("Session not found")
          return
        }

        setSession(sessionData)
        setBar(sessionData.bar_trivia_games.bars)
        
        // Get participants
        const { data: participantsData } = await supabase
          .from("bar_trivia_participants")
          .select(`
            *,
            users(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq("session_id", sessionData.id)
          .order("score", { ascending: false })

        console.log("🔍 DEBUG: Participants loaded:", participantsData)
        console.log("🔍 DEBUG: Number of participants:", participantsData?.length || 0)
        setParticipants(participantsData || [])
        
      } catch (err) {
        setError("Failed to load session")
        console.error("Error loading session:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionCode])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 relative">
        <Header user={user} />
        
        {/* Subtle gradient overlay */}
        
        
        <div className="flex items-center justify-center p-4 pt-20 relative z-10">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white">Loading session...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-950 relative">
        <Header user={user} />
        
        {/* Subtle gradient overlay */}
        
        
        <div className="flex items-center justify-center p-4 pt-20 relative z-10">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-400 mb-4">{error || "Session not found"}</p>
                <Button onClick={() => router.push("/bar/join")} className="w-full">
                  Back to Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      
      {/* Subtle gradient overlay */}
      
      
      <div className="max-w-4xl mx-auto p-4 pt-8 space-y-6 relative z-10">
        {/* Session Header */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{bar?.name}</h1>
                <p className="text-white/60">Trivia Session {session.session_code}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-white/80">
                  <Users className="h-4 w-4" />
                  {participants.length} players
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4" />
                  {session.status === "waiting" ? "Waiting to start" : 
                   session.status === "active" ? "In progress" : 
                   session.status === "completed" ? "Completed" : session.status}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Game Status */}
        {user && participants.find(p => p.user_id === user.id)?.finished_at && (
          <Card className="bg-green-500/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-green-400">
                <Trophy className="h-6 w-6" />
                <div>
                  <div className="font-medium text-lg">Game Already Completed</div>
                  <div className="text-green-300">
                    You completed this trivia session with a score of <strong>{participants.find(p => p.user_id === user.id)?.score}</strong>.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Session Complete - You can only play once per session. Check the leaderboard to see how you ranked!</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        {participants.length > 0 && (
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Live Leaderboard
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-purple-500/20"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants
                  .sort((a, b) => b.score - a.score)
                  .map((participant, index) => {
                    const isCurrentUser = user && participant.user_id === user.id
                    const accuracy = participant.questions_answered > 0 
                      ? Math.round((participant.correct_answers / participant.questions_answered) * 100)
                      : 0
                    
                    return (
                      <div
                        key={participant.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                          isCurrentUser
                            ? "bg-blue-600/40 border border-blue-500/50 shadow-lg ring-2 ring-blue-400/30"
                            : "bg-gray-800/50 border border-gray-600/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCurrentUser
                              ? "bg-blue-500 text-blue-900"
                              : "bg-gray-600 text-gray-200"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-medium">
                              {participant.display_name || participant.users?.display_name || participant.users?.username || "Anonymous"}
                              {isCurrentUser && (
                                <span className="ml-2 text-blue-400 text-xs font-bold">
                                  (You)
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-4 text-white/60 text-sm">
                              <span>{participant.correct_answers}/{participant.questions_answered} correct</span>
                              <span>{accuracy}% accuracy</span>
                              {participant.finished_at && (
                                <span className="text-green-400 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">
                            {participant.score}
                          </div>
                          <div className="text-white/60 text-sm">
                            {participant.average_response_time.toFixed(1)}s avg
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How to Play */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">How to Play</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-white/80">
                <div>• Answer questions as quickly as possible</div>
                <div>• Faster answers earn more points</div>
                <div>• Beat the high score to win a drink</div>
                <div>• Show your reward to bar staff</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Winning Drinks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-white/80">
                <div>• High score gets a free drink</div>
                <div>• Perfect scores get premium drinks</div>
                <div>• Rewards are tracked automatically</div>
                <div>• Valid only at this bar location</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
