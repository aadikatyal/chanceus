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
import VenuesPageChrome from "@/components/venues/venues-page-chrome"
import VenuesHero from "@/components/venues/venues-hero"
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

  if (userLoading || isLoading) {
    return (
      <VenuesPageChrome user={user}>
        <section className="chance-premium-card mx-auto max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--chance-border)] border-t-[var(--chance-brand)]" />
          <p className="chance-text-caption">{userLoading ? "Checking you in…" : "Loading venue…"}</p>
        </section>
      </VenuesPageChrome>
    )
  }

  if (error) {
    return (
      <VenuesPageChrome user={user}>
        <div className="chance-venues-join mx-auto max-w-lg space-y-4">
          <VenuesHero kicker="Check-in" title="Couldn’t find that event" subtitle="Try scanning again or enter the code from the host." />
          <section className="chance-premium-card p-4 sm:p-5">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <QRCodeScanner onCodeScanned={handleCodeScanned} onManualCode={handleManualCode} onSessionCode={handleSessionCode} />
            </div>
          </section>
        </div>
      </VenuesPageChrome>
    )
  }

  if (!bar) {
    return (
      <VenuesPageChrome user={user}>
        <div className="chance-venues-join mx-auto max-w-lg space-y-4">
          <VenuesHero
            kicker="Live events"
            title="Check in"
            subtitle="Scan the QR at the venue or enter the code to see what’s happening tonight."
          />
          <section className="chance-premium-card chance-venues-panel p-4 sm:p-5">
            <QRCodeScanner onCodeScanned={handleCodeScanned} onManualCode={handleManualCode} onSessionCode={handleSessionCode} />
          </section>
        </div>
      </VenuesPageChrome>
    )
  }

  console.log("Rendering with user:", user, "userLoading:", userLoading)

  return (
    <VenuesPageChrome user={user}>
      <div className="chance-venues-join mx-auto max-w-3xl space-y-6">
        <VenuesHero
          kicker="Live event"
          title={bar.name}
          subtitle={bar.description || "Check in, pick tonight's session, and compete for the in-room board."}
          live={sessions.some((s) => s.status === "active")}
          stats={[{ label: "sessions open", value: sessions.length }]}
        />
        <section className="chance-premium-card chance-venues-panel p-4 sm:p-5">
          <div className="chance-rail-card-head mb-3">
            <h2 className="chance-section-title text-base">Venue details</h2>
            <Badge variant="secondary" className="chance-venues-live-pill border-0">
              Active
            </Badge>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-[var(--chance-muted-fg)]">
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
          </div>
        </section>

        {/* Available Sessions */}
        {sessions.length > 0 ? (
          <section className="chance-premium-card chance-venues-panel p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="chance-section-title flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-[var(--chance-brand)]" />
                Tonight&apos;s sessions
              </h2>
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
            </div>
              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Your display name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Name on the live leaderboard"
                    className="chance-input"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pick a session</Label>
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`chance-venues-session-pick cursor-pointer ${
                          selectedSession === session.id ? "is-selected" : ""
                        }`}
                        onClick={() => setSelectedSession(session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              Session {session.session_code}
                            </p>
                            <div className="chance-text-caption mt-1 flex flex-wrap items-center gap-4">
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
                  className="chance-hero-cta-primary chance-focus-ring w-full"
                  disabled={!selectedSession || !displayName.trim()}
                >
                  {userParticipant ? "Rejoin live session" : "Join live session"}
                </Button>
              </form>
          </section>
        ) : (
          <section className="chance-premium-card chance-venues-panel p-6 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-[var(--chance-muted-fg)] opacity-60" />
              <h3 className="text-lg font-medium mb-2">Doors closed for now</h3>
              <p className="chance-text-caption">
                No sessions are open at {bar.name}. Check back later or ask the host to start the floor.
              </p>
          </section>
        )}

        <section className="chance-premium-card chance-venues-panel p-4 sm:p-6">
            <h3 className="chance-section-title text-base mb-3">How the night works</h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium">Check in</h4>
                <ul className="chance-text-caption space-y-1">
                  <li>Scan QR or enter venue code</li>
                  <li>Claim your leaderboard name</li>
                  <li>Join the active session</li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Compete & return</h4>
                <ul className="chance-text-caption space-y-1">
                  <li>Climb the live in-room board</li>
                  <li>Rewards per venue rules</li>
                  <li>Come back next week to defend rank</li>
                </ul>
              </div>
            </div>
        </section>
      </div>
    </VenuesPageChrome>
  )
}

export default function BarJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="chance-competitive-theme flex min-h-screen items-center justify-center bg-[var(--chance-bg)] p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--chance-border)] border-t-[var(--chance-brand)]" />
        </div>
      }
    >
      <BarJoinPageContent />
    </Suspense>
  )
}
