"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, Users, Clock, Brain, ArrowLeft, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import BarTriviaGame from "@/components/bar/bar-trivia-game"
import { 
  getBarByCode, 
  getActiveBarSessions,
  getSessionParticipants 
} from "@/lib/bar-actions"
import { createClient } from "@/lib/supabase/client"
import type { Bar, BarTriviaSession, BarTriviaParticipant } from "@/lib/bar-actions"
import Header from "@/components/navigation/header"
import type { User } from "@/lib/supabase/client"

export default function BarTriviaSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<BarTriviaSession | null>(null)
  const [bar, setBar] = useState<Bar | null>(null)
  const [participants, setParticipants] = useState<BarTriviaParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [gameStarted, setGameStarted] = useState(false)
  const [participantId, setParticipantId] = useState<string>("")
  const [displayName, setDisplayName] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadAttemptsRef = useRef(0)

  useEffect(() => {
    // Load user data
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single()
        
        setUser(userProfile)
      }
    }
    loadUser()

    if (sessionId) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Add a timeout to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        if (isLoading) {
          console.error("⏰ Session loading timeout after 10 seconds")
          setError("Session loading timed out. Please try again.")
          setIsLoading(false)
        }
      }, 10000) // 10 second timeout

      loadSessionData()
      
      // Set up real-time subscription for participant updates
      const supabase = createClient()
      const channel = supabase
        .channel('bar_trivia_participants')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bar_trivia_participants',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('🔄 Real-time participant update:', payload)
            // Immediately update participants without full reload for better performance
            if (payload.eventType === 'UPDATE' && payload.new) {
              setParticipants(prev => {
                const updated = prev.map(p => 
                  p.id === payload.new.id ? { ...p, ...payload.new } : p
                )
                // Sort by score after update
                return updated.sort((a, b) => b.score - a.score)
              })
            } else if (payload.eventType === 'INSERT' && payload.new) {
              setParticipants(prev => {
                const updated = [...prev, payload.new]
                return updated.sort((a, b) => b.score - a.score)
              })
            } else {
              // For other events, do a full reload
              if (!isLoadingData) {
                loadSessionData()
              }
            }
          }
        )
        .subscribe()

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId])

  const loadSessionData = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingData) {
      console.log("🔄 Load session data already in progress, skipping...")
      return
    }
    
    // Prevent infinite retries
    loadAttemptsRef.current += 1
    if (loadAttemptsRef.current > 5) {
      console.error("❌ Too many load attempts, giving up")
      setError("Too many failed attempts to load session. Please refresh the page.")
      setIsLoading(false)
      return
    }
    
    setIsLoadingData(true)
    
    try {
      console.log("🔄 Loading session data for sessionId:", sessionId)
      console.log("🔄 SessionId type:", typeof sessionId)
      console.log("🔄 SessionId length:", sessionId?.length)
      
      if (!sessionId) {
        console.error("❌ No sessionId provided")
        setError("No session ID provided")
        setIsLoading(false)
        return
      }
      
      // Get session directly by ID
      const supabase = createClient()
      console.log("🔄 Querying bar_trivia_sessions table...")
      
      const { data: currentSession, error: sessionError } = await supabase
        .from("bar_trivia_sessions")
        .select("*")
        .eq("id", sessionId)
        .single()
      
      console.log("🔄 Session query result:", { currentSession, sessionError })
      
      if (sessionError) {
        console.error("❌ Session query error:", sessionError)
        console.error("❌ Error details:", {
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint
        })
        
        // Check if there are any sessions at all
        const { data: allSessions, error: allSessionsError } = await supabase
          .from("bar_trivia_sessions")
          .select("*")
          .limit(10)
        
        console.log("🔄 All sessions in database:", { allSessions, allSessionsError })
        
        setError(`Session not found. Error: ${sessionError.message}`)
        setIsLoading(false)
        return
      }
      
      if (!currentSession) {
        console.error("❌ No session found with ID:", sessionId)
        setError(`Session not found with ID: ${sessionId}`)
        setIsLoading(false)
        return
      }

      console.log("✅ Session found:", currentSession)
      setSession(currentSession)
      
      // Load bar info by ID (not code)
      console.log("🔄 Loading bar data for bar_id:", currentSession.bar_id)
      const { data: barData, error: barError } = await supabase
        .from("bars")
        .select("*")
        .eq("id", currentSession.bar_id)
        .single()
      
      console.log("🔄 Bar data loaded:", { barData, barError })
      if (barData) {
        console.log("✅ Bar data loaded successfully")
        setBar(barData)
      } else {
        console.error("❌ Failed to load bar data:", barError)
        setError(`Failed to load bar data: ${barError?.message || 'Unknown error'}`)
        setIsLoading(false)
        return
      }

      // Load participants
      console.log("🔄 Loading participants...")
      const participantsData = await getSessionParticipants(sessionId)
      console.log("✅ Participants loaded:", participantsData)
      setParticipants(participantsData)

      // Check if game has started
      setGameStarted(currentSession.status === "active")
      console.log("✅ Session data loaded successfully")
      
      // Clear the timeout since we loaded successfully
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      // Reset load attempts on success
      loadAttemptsRef.current = 0

    } catch (err) {
      console.error("❌ Error loading session:", err)
      setError(`Failed to load session data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      console.log("🔄 Setting isLoading to false and isLoadingData to false")
      setIsLoading(false)
      setIsLoadingData(false)
    }
  }

  const handleGameEnd = async (finalScore: number, questionsAnswered: number, correctAnswers: number) => {
    console.log("🎮 Game ended:", { finalScore, questionsAnswered, correctAnswers })
    
    try {
      // Update participant score in the database
      const supabase = createClient()
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      console.log("🔍 Current user:", authUser?.id)
      
      if (!authUser) {
        console.error("❌ No authenticated user found")
        toast.error("You must be logged in to save scores")
        return
      }
      
      console.log("🔄 Updating score in database...", {
        sessionId,
        userId: authUser.id,
        finalScore,
        questionsAnswered,
        correctAnswers
      })
      
      // First, let's check what participant record exists
      const { data: existingParticipant, error: fetchError } = await supabase
        .from("bar_trivia_participants")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", authUser.id)
        .single()
      
      console.log("🔍 Existing participant record:", { existingParticipant, fetchError })
      
      if (!existingParticipant) {
        console.error("❌ No participant record found for this user and session")
        toast.error("No participant record found. Please rejoin the session.")
        return
      }
      
      const { data: updateData, error } = await supabase
        .from("bar_trivia_participants")
        .update({
          score: finalScore,
          questions_answered: questionsAnswered,
          correct_answers: correctAnswers,
          finished_at: new Date().toISOString()
        })
        .eq("id", existingParticipant.id) // Use the participant ID instead of session_id + user_id
        .select()
      
      console.log("🔄 Update result:", { updateData, error })
      
      if (error) {
        console.error("❌ Error updating participant score:", error)
        toast.error("Failed to save score: " + error.message)
      } else {
        console.log("✅ Participant score updated successfully:", updateData)
        toast.success("Game completed! Check with bar staff for your drink reward.")
        
        // Force reload participants to show updated scores
        console.log("🔄 Reloading participants...")
        const updatedParticipants = await getSessionParticipants(sessionId)
        console.log("✅ Updated participants after game end:", updatedParticipants)
        setParticipants(updatedParticipants)
        
        // Debug: Check what's actually in the database
        const { data: debugParticipants, error: debugError } = await supabase
          .from("bar_trivia_participants")
          .select("*")
          .eq("session_id", sessionId)
        
        console.log("🔍 Debug - All participants in database:", { debugParticipants, debugError })
        
        // Also trigger a full session data reload to be safe
        setTimeout(() => {
          console.log("🔄 Triggering delayed reload...")
          loadSessionData()
        }, 1000)
      }
    } catch (err) {
      console.error("❌ Exception in handleGameEnd:", err)
      toast.error("Failed to save score: " + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

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
                <p className="text-white">Loading trivia session...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 relative">
        <Header user={user} />
        
        {/* Subtle gradient overlay */}
        
        
        <div className="flex items-center justify-center p-4 pt-20 relative z-10">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-center text-red-400">Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button 
                onClick={() => router.push("/bar/join")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Join Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!session || !bar) {
    return (
      <div className="min-h-screen bg-gray-950 relative">
        {/* Subtle gradient overlay */}
        
        <Header user={user} />
        <div className="flex items-center justify-center p-4 pt-20">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-red-400 mb-2">Session Not Found</h2>
              <p className="text-white/60 mb-4">This trivia session doesn't exist or has ended.</p>
              <Button 
                onClick={() => router.push("/bar/join")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Join Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Header user={user} />
      <div className="max-w-4xl mx-auto p-4 pt-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="bg-gray-800 border-gray-600 text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{bar.name}</h1>
            <p className="text-white/80 mt-1">Trivia Session {session.session_code}</p>
          </div>
        </div>

        {/* Session Status */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-white/90" />
                  <span className="text-white font-medium">{participants.length} players</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-white/90" />
                  <span className="text-white/90">
                    {session.status === "waiting" ? "Waiting to start" : "In progress"}
                  </span>
                </div>
              </div>
              <Badge 
                variant={session.status === "waiting" ? "default" : "secondary"}
                className={
                  session.status === "waiting" 
                    ? "bg-yellow-600/60 text-yellow-200 border-yellow-400/50"
                    : "bg-green-600/60 text-green-200 border-green-400/50"
                }
              >
                {session.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Game Area */}
        {!gameStarted ? (
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-12 text-center">
              <Brain className="h-16 w-16 text-white/60 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Waiting for Game to Start</h2>
              <p className="text-white/90 mb-6">
                The bar staff will start the trivia game soon. Get ready to compete for drinks!
              </p>
              
              {participants.length > 0 && (
                <div className="bg-black/30 rounded-lg p-4 max-w-md mx-auto border border-purple-500/30">
                  <h3 className="text-white font-medium mb-3">Players in this session:</h3>
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between text-white/90">
                        <span>{participant.display_name}</span>
                        <Badge variant="outline" className="bg-gray-800 border-gray-600 text-white">
                          Ready
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Game Component */}
            <BarTriviaGame
              sessionId={sessionId}
              participantId={participantId}
              displayName={displayName}
              maxQuestions={10} // This should come from the trivia game settings
              timePerQuestion={30} // This should come from the trivia game settings
              onGameEnd={handleGameEnd}
              hasCompletedGame={participants.find(p => p.user_id === user?.id)?.finished_at !== null}
              currentScore={participants.find(p => p.user_id === user?.id)?.score || 0}
            />

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
                      onClick={async () => {
                        console.log("🔄 Manual refresh clicked")
                        setIsLoadingData(false) // Reset loading state
                        await loadSessionData()
                      }}
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
                        const isCurrentlyPlaying = participant.questions_answered > 0 && !participant.finished_at
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
                            } ${isCurrentlyPlaying ? "ring-2 ring-green-500/50 animate-pulse" : ""}`}
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
                                  {participant.display_name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-blue-400 text-xs font-bold">
                                      (You)
                                    </span>
                                  )}
                                  {isCurrentlyPlaying && (
                                    <span className="ml-2 text-green-400 text-xs">
                                      🎮 Playing
                                    </span>
                                  )}
                                </span>
                                {participant.finished_at && (
                                  <span className="text-green-400 text-xs">
                                    ✅ Completed
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold text-lg">
                                {participant.score}
                                {isCurrentlyPlaying && (
                                  <span className="ml-1 text-green-400 text-sm">⚡</span>
                                )}
                              </div>
                              <div className="text-white/80 text-sm">
                                {participant.correct_answers}/{participant.questions_answered} correct
                              </div>
                              <div className="text-white/60 text-xs">
                                {accuracy}% accuracy
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-white font-medium mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90 text-sm">
              <div>
                <h4 className="font-medium text-white mb-2">Game Rules</h4>
                <ul className="space-y-1">
                  <li>• Answer questions as quickly as possible</li>
                  <li>• Faster answers earn more points</li>
                  <li>• Beat the high score to win a drink</li>
                  <li>• Show your reward to bar staff</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Winning Drinks</h4>
                <ul className="space-y-1">
                  <li>• High score gets a free drink</li>
                  <li>• Perfect scores get premium drinks</li>
                  <li>• Rewards are tracked automatically</li>
                  <li>• Valid only at this bar location</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
