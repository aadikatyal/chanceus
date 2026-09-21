"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Globe, Clock, Users, Trophy, RefreshCw, Play } from "lucide-react"
import { toast } from "sonner"
import QRCodeScanner from "@/components/bar/qr-code-scanner"
import { getBarByCode, joinBarTriviaSession, getActiveBarSessions, getMyBars } from "@/lib/bar-actions"
import type { Bar, BarTriviaSession } from "@/lib/bar-actions"
import Header from "@/components/navigation/header"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/supabase/client"
import { getCompleteUserData } from "@/lib/user-utils"

function BarJoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bar, setBar] = useState<Bar | null>(null)
  const [bars, setBars] = useState<Bar[]>([])
  const [sessions, setSessions] = useState<BarTriviaSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [error, setError] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [userParticipant, setUserParticipant] = useState<any>(null)

  const code = searchParams.get("code")
  const sessionCode = searchParams.get("session")

  useEffect(() => {
    // Load user data first
    const loadUser = async () => {
      console.log("🔍 DEBUG: Starting loadUser function")
      console.log("🔍 DEBUG: Current URL:", window.location.href)
      console.log("🔍 DEBUG: Pathname:", window.location.pathname)
      console.log("🔍 DEBUG: Search params:", window.location.search)
      console.log("🔍 DEBUG: Code param:", code)
      console.log("🔍 DEBUG: SessionCode param:", sessionCode)
      
      try {
        const userData = await getCompleteUserData()
        if (userData) {
          console.log("🔍 DEBUG: User data loaded:", userData)
          setUser(userData)
        } else {
          console.log("🔍 DEBUG: No authenticated user found - redirecting to login")
          setUser(null)
          // Redirect to login with return URL to preserve parameters
          const currentUrl = window.location.pathname + window.location.search
          console.log("🔍 DEBUG: Redirecting to login with URL:", currentUrl)
          router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`)
          return
        }
      } catch (error) {
        console.error("🔍 DEBUG: Error loading user data:", error)
        setUser(null)
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        return
      }
      setUserLoading(false)
    }
    loadUser()
  }, [router, code, sessionCode])

  // Separate useEffect for loading bar/session data
  useEffect(() => {
    console.log("🔍 DEBUG: Main useEffect triggered")
    console.log("🔍 DEBUG: userLoading:", userLoading)
    console.log("🔍 DEBUG: sessionCode:", sessionCode)
    console.log("🔍 DEBUG: code:", code)
    console.log("🔍 DEBUG: user:", user)
    
    if (!userLoading && (sessionCode || code)) {
      if (sessionCode) {
        console.log("🔍 DEBUG: Calling loadBarBySessionCode with:", sessionCode)
        // Session code - load bar and show sessions (same as venue code)
        setError("") // Clear any existing errors
        loadBarBySessionCode(sessionCode)
      } else if (code) {
        console.log("🔍 DEBUG: Calling loadBarByCode with:", code)
        // Bar code - load bar and show sessions
        setError("") // Clear any existing errors
        loadBarByCode(code)
      }
    } else {
      console.log("🔍 DEBUG: Not loading data - userLoading:", userLoading, "hasParams:", !!(sessionCode || code))
    }
  }, [sessionCode, code, userLoading, user])

  const loadUserBars = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const barsData = await getMyBars()
      setBars(barsData)
    } catch (err) {
      setError("Failed to load your bars. Please try again.")
      console.error("Error loading user bars:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBarByCode = async (barCode: string) => {
    console.log("🔍 DEBUG: loadBarByCode called with:", barCode)
    setIsLoading(true)
    setError("")
    
    try {
      console.log("🔍 DEBUG: Loading bar with code:", barCode)
      const barData = await getBarByCode(barCode)
      console.log("🔍 DEBUG: Bar data found:", barData)
      
      if (barData) {
        console.log("🔍 DEBUG: Setting bar data:", barData)
        setBar(barData)
        // Load active sessions for this bar
        console.log("🔍 DEBUG: Loading sessions for bar ID:", barData.id)
        const sessionsData = await getActiveBarSessions(barData.id)
        console.log("🔍 DEBUG: Sessions found:", sessionsData)
        setSessions(sessionsData)
        
        // Check if current user has already played in any of these sessions
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        console.log("Checking participation for venue code - Current user:", currentUser)
        
        if (currentUser && sessionsData.length > 0) {
          // Check each session to see if user has completed any
          for (const session of sessionsData) {
            const { data: participant } = await supabase
              .from("bar_trivia_participants")
              .select("*")
              .eq("session_id", session.id)
              .eq("user_id", currentUser.id)
              .single()
            
            console.log(`Checking session ${session.id}:`, participant)
            
            if (participant && participant.finished_at) {
              console.log("User already completed session, redirecting to session page")
              console.log("🔍 DEBUG: Redirecting to session code:", session.session_code)
              router.push(`/session/${session.session_code}`)
              return
            }
          }
        }
      } else {
        console.log("No bar found for code:", barCode)
        setError("Bar not found. Please check your code and try again.")
      }
    } catch (err) {
      setError("Failed to load bar information. Please try again.")
      console.error("Error loading bar:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBarBySessionCode = async (sessionCode: string) => {
    console.log("🔍 DEBUG: loadBarBySessionCode called with:", sessionCode)
    setIsLoading(true)
    setError("")

    try {
      const supabase = createClient()

      // Find the session to get the bar_id
      console.log("🔍 DEBUG: Searching for session with code:", sessionCode)
      const { data: session, error: sessionError } = await supabase
        .from("bar_trivia_sessions")
        .select(`
          *,
          bar_trivia_games!inner(
            bar_id,
            bars!inner(*)
          )
        `)
        .eq("session_code", sessionCode)
        .in("status", ["waiting", "active"])
        .single()

      console.log("🔍 DEBUG: Session query result:", { session, sessionError })

      if (sessionError || !session) {
        console.log("🔍 DEBUG: Session not found, error:", sessionError)
        setError("Session not found. Please check your session code and try again.")
        return
      }

      // Set the bar data
      setBar(session.bar_trivia_games.bars)
      
      // Load all active sessions for this bar
      const sessionsData = await getActiveBarSessions(session.bar_trivia_games.bar_id)
      setSessions(sessionsData)
      
      // Check if current user is already a participant in this session
      // First get the current user directly from auth
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      console.log("Current user from auth:", currentUser)
      
      if (currentUser) {
        const { data: participant } = await supabase
          .from("bar_trivia_participants")
          .select("*")
          .eq("session_id", session.id)
          .eq("user_id", currentUser.id)
          .single()
        
        console.log("User participant check:", participant)
        console.log("User ID:", currentUser.id)
        console.log("Session ID:", session.id)
        console.log("Participant finished_at:", participant?.finished_at)
        
        setUserParticipant(participant)
        
        // If user has already completed this session, redirect to session page
        if (participant && participant.finished_at) {
          console.log("User already completed session, redirecting to session page")
          console.log("🔍 DEBUG: Redirecting to session code:", session.session_code)
          router.push(`/session/${session.session_code}`)
          return
        }
        
        // If user is already a participant but not completed, pre-fill their display name
        if (participant) {
          setDisplayName(participant.display_name)
          setSelectedSession(session.id)
        }
      } else {
        console.log("No authenticated user found")
      }
      
    } catch (err) {
      setError("Failed to load session information. Please try again.")
      console.error("Error loading session:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeScanned = (scannedCode: string) => {
    setError("") // Clear any existing errors
    loadBarByCode(scannedCode)
  }

  const handleManualCode = (manualCode: string) => {
    setError("") // Clear any existing errors
    loadBarByCode(manualCode)
  }

  const handleSessionCode = async (sessionCodeToUse?: string) => {
    const codeToUse = sessionCodeToUse || sessionCode
    console.log("Session code entered:", codeToUse)
    
    if (!codeToUse) {
      setError("Session code is required")
      return
    }
    
    // Load bar and sessions using session code (same as venue code)
    // This will automatically redirect if user has already completed the session
    loadBarBySessionCode(codeToUse)
  }

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSession || !displayName.trim()) {
      toast.error("Please select a session and enter your name")
      return
    }

    try {
      const session = sessions.find(s => s.id === selectedSession)
      if (!session) {
        toast.error("Session not found")
        return
      }

      console.log("Joining session:", session)
      console.log("Session ID:", session.id)
      console.log("Session code:", session.session_code)
      console.log("Display name:", displayName.trim())
      console.log("Display name length:", displayName.trim().length)
      console.log("Display name type:", typeof displayName.trim())

      const result = await joinBarTriviaSession(session.session_code, displayName.trim())
      console.log("Join result:", result)
      
      if (result.participant) {
        toast.success("Successfully joined the trivia session!")
        
        // Redirect to the game session
        console.log("Redirecting to:", `/bar/session/${session.id}`)
        router.push(`/bar/session/${session.id}`)
      } else {
        toast.error("Failed to join session")
      }
    } catch (err: any) {
      console.error("Error joining session:", err)
      toast.error(err.message || "Failed to join session")
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-950 relative">
        <Header user={user} />
        
        {/* Subtle gradient overlay */}
        
        
        <div className="flex items-center justify-center p-4 pt-20 relative z-10">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white">Checking authentication...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
                <p className="text-white">Loading...</p>
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
              <Alert variant="destructive" className="bg-red-500/20 border-red-500/40">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
              <QRCodeScanner 
                onCodeScanned={handleCodeScanned}
                onManualCode={handleManualCode}
                onSessionCode={handleSessionCode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }


  if (!bar) {
    return (
      <div className="min-h-screen bg-gray-950 relative">
        <Header user={user} />
        
        {/* Subtle gradient overlay */}
        
        
        <div className="flex items-center justify-center p-4 pt-20 relative z-10">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-center text-white">Join Bar Trivia</CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeScanner 
                onCodeScanned={handleCodeScanned}
                onManualCode={handleManualCode}
                onSessionCode={handleSessionCode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  console.log("Rendering with user:", user, "userLoading:", userLoading)

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      
      {/* Subtle gradient overlay */}
      
      
      <div className="max-w-4xl mx-auto p-4 pt-8 space-y-6 relative z-10">
        {/* Bar Information */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl">{bar.name}</CardTitle>
                {bar.description && (
                  <p className="text-white/80 mt-1">{bar.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80">
              {bar.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{bar.address}</span>
                </div>
              )}
              {bar.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{bar.phone}</span>
                </div>
              )}
              {bar.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={bar.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug info */}
        <div className="text-white text-sm">
          Debug: sessions.length = {sessions.length}
          {sessions.map(s => <div key={s.id}>Session: {s.session_code}, Status: {s.status}</div>)}
        </div>

        {/* Available Sessions */}
        {sessions.length > 0 ? (
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Available Trivia Sessions
              </CardTitle>
              {userParticipant && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">You've already played this session!</span>
                  </div>
                  <div className="text-green-300 text-sm mt-1">
                    Display Name: {userParticipant.display_name} | 
                    Score: {userParticipant.score} points | 
                    Status: {userParticipant.finished_at ? 'Completed' : 'In Progress'}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-white">
                    Your Display Name
                  </Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name for the leaderboard"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-white/60"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Select a Session</Label>
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSession === session.id
                            ? "bg-purple-500/30 border-purple-400"
                            : "bg-gray-800 border-gray-600 hover:bg-gray-950 relative/40"
                        }`}
                        onClick={() => setSelectedSession(session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              Session {session.session_code}
                            </p>
                            <div className="flex items-center gap-4 text-white/60 text-sm mt-1">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {session.total_players} players
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.status === "waiting" ? "Waiting to start" : "In progress"}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={session.status === "waiting" ? "default" : "secondary"}
                            className={
                              session.status === "waiting" 
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-green-500/20 text-green-400 border-green-500/30"
                            }
                          >
                            {session.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className={`w-full text-white ${
                    userParticipant 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  disabled={!selectedSession || !displayName.trim()}
                >
                  {userParticipant ? "Rejoin Trivia Session" : "Join Trivia Session"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">No Active Sessions</h3>
              <p className="text-white/60">
                There are no trivia sessions available at {bar.name} right now.
                Check back later or ask the staff to start a session!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-white font-medium mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/80 text-sm">
              <div>
                <h4 className="font-medium text-white mb-2">Getting Started</h4>
                <ul className="space-y-1">
                  <li>• Scan QR code or enter venue code</li>
                  <li>• Enter your display name</li>
                  <li>• Join an available session</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Winning Drinks</h4>
                <ul className="space-y-1">
                  <li>• Beat the high score to win a drink</li>
                  <li>• Answer questions quickly for bonus points</li>
                  <li>• Show your reward to bar staff</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function BarJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 relative">
        <Header />
        <div className="flex items-center justify-center p-4 pt-20">
          <Card className="w-full max-w-md bg-gray-900/80 border-gray-800">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <BarJoinPageContent />
    </Suspense>
  )
}
