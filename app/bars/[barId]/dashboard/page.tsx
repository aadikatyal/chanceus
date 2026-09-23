"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Play, 
  Pause, 
  Square, 
  Users, 
  Trophy, 
  Clock, 
  QrCode, 
  Copy,
  Settings,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  StopCircle
} from "lucide-react"
import { toast } from "sonner"
import { 
  getBarByCode, 
  getBarTriviaGames, 
  getActiveBarSessions,
  startBarTriviaSession,
  createBarTriviaSession,
  endBarTriviaSession,
  cancelBarTriviaSession
} from "@/lib/bar-actions"
import { createClient } from "@/lib/supabase/client"
import QuickSetupWizard from "@/components/bar/quick-setup-wizard"
import QRCodeGenerator from "@/components/bar/qr-code-generator"
import type { Bar, BarTriviaGame, BarTriviaSession } from "@/lib/bar-actions"
import VenuesPageChrome from "@/components/venues/venues-page-chrome"
import VenuesHero from "@/components/venues/venues-hero"
import type { User } from "@/lib/supabase/client"

export default function BarDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const barId = params.barId as string

  const [bar, setBar] = useState<Bar | null>(null)
  const [games, setGames] = useState<BarTriviaGame[]>([])
  const [sessions, setSessions] = useState<BarTriviaSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<string>("")
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showStartConfirmation, setShowStartConfirmation] = useState(false)

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

    if (barId) {
      loadBarData()
    }
  }, [barId])

  const loadBarData = async () => {
    try {
      // Clear any old demo data from localStorage
      localStorage.removeItem('demoBar')
      localStorage.removeItem('demoGames')
      localStorage.removeItem('demoSessions')
      
      // Load bar directly by ID from database
      const supabase = createClient()
      const { data: barData, error: barError } = await supabase
        .from("bars")
        .select("*")
        .eq("id", barId)
        .single()
      
      if (barError || !barData) {
        toast.error("Bar not found in database")
        return
      }

      // Load games and sessions
      const [gamesData, sessionsData] = await Promise.all([
        getBarTriviaGames(barId),
        getActiveBarSessions(barId)
      ])
      
      console.log("Bar ID:", barId)
      console.log("Bar Data:", barData)
      console.log("Games Data:", gamesData)
      console.log("Sessions Data:", sessionsData)
      console.log("Sessions statuses:", sessionsData?.map(s => ({ id: s.id, status: s.status, started_at: s.started_at })))
      
      // Check if we have any errors
      if (gamesData && gamesData.length === 0) {
        console.log("No games found for bar:", barId)
      }
      
      setBar(barData)
      setGames(gamesData || [])
      setSessions(sessionsData || [])
      
      // Debug: Log session statuses after setting
      console.log("Sessions after setting state:", sessionsData?.map(s => ({ 
        id: s.id, 
        status: s.status, 
        started_at: s.started_at,
        session_code: s.session_code 
      })))
      
      // Auto-select the first game if available
      if (gamesData && gamesData.length > 0 && !selectedGame) {
        console.log("Auto-selecting first game:", gamesData[0])
        setSelectedGame(gamesData[0].id)
      }
      
    } catch (error) {
      console.error("Error loading bar data from database:", error)
      toast.error("Failed to load bar data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSession = async () => {
    console.log("handleCreateSession called")
    console.log("selectedGame:", selectedGame)
    console.log("games:", games)
    console.log("games.length:", games.length)
    console.log("barId:", barId)
    
    if (!selectedGame) {
      console.log("No game selected - available games:", games.map(g => ({ id: g.id, name: g.name })))
      toast.error("Please select a trivia game")
      return
    }

    setIsCreatingSession(true)
    try {
      console.log("Creating session for game:", selectedGame)
      const session = await createBarTriviaSession(barId, selectedGame)
      console.log("Session created successfully:", session)
      setSessions(prev => [session, ...prev])
      setShowJoinCode(true)
      toast.success("Trivia session created!")
    } catch (error: any) {
      console.error("Error creating session:", error)
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        barId,
        selectedGame
      })
      toast.error(`Failed to create session: ${error.message}`)
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      console.log("Starting session:", sessionId)
      await startBarTriviaSession(sessionId)
      console.log("Session started, reloading data...")
      await loadBarData() // Reload to get updated session status
      setRefreshKey(prev => prev + 1) // Force re-render
      console.log("Data reloaded, sessions:", sessions)
      toast.success("Session started!")
    } catch (error: any) {
      console.error("Error starting session:", error)
      toast.error(error.message || "Failed to start session")
    }
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      await endBarTriviaSession(sessionId)
      await loadBarData() // Reload to get updated session status
      toast.success("Session ended!")
    } catch (error: any) {
      toast.error(error.message || "Failed to end session")
    }
  }

  const handleCancelSession = async (sessionId: string) => {
    try {
      await cancelBarTriviaSession(sessionId)
      await loadBarData() // Reload to get updated session status
      toast.success("Session cancelled!")
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel session")
    }
  }

  const copyJoinCode = (sessionCode: string) => {
    navigator.clipboard.writeText(sessionCode)
    toast.success("Join code copied to clipboard!")
  }

  const copyJoinUrl = (sessionCode: string) => {
    const url = `${window.location.origin}/bar/join?session=${sessionCode}`
    navigator.clipboard.writeText(url)
    toast.success("Join URL copied to clipboard!")
  }

  const copyVenueCode = (venueCode: string) => {
    navigator.clipboard.writeText(venueCode)
    toast.success("Venue code copied to clipboard!")
  }

  if (isLoading) {
    return (
      <VenuesPageChrome user={user} host>
        <section className="chance-premium-card p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--chance-border)] border-t-[var(--chance-brand)]" />
          <p className="chance-text-caption">Opening control room…</p>
        </section>
      </VenuesPageChrome>
    )
  }

  if (!bar) {
    return (
      <VenuesPageChrome user={user} host>
        <section className="chance-premium-card p-8 text-center">
          <h2 className="text-xl font-semibold text-[var(--chance-no)] mb-2">Venue not found</h2>
          <p className="chance-text-caption mb-4">This venue may have been removed.</p>
          <Button onClick={() => router.push("/bars")} className="chance-hero-cta-primary chance-focus-ring">
            Back to venues
          </Button>
        </section>
      </VenuesPageChrome>
    )
  }

  const activeSession = sessions.find(s => s.status === "active")
  const waitingSessions = sessions.filter(s => s.status === "waiting")

  return (
    <VenuesPageChrome user={user} host>
      <div className="space-y-6">
        <VenuesHero
          kicker="Control room"
          title={bar.name}
          subtitle="Run the live floor — start sessions, show QR, watch the board fill."
          live={Boolean(activeSession)}
          stats={[
            { label: "waiting", value: waitingSessions.length },
            { label: "active", value: activeSession ? 1 : 0 },
          ]}
        />
        <div className="flex items-center justify-between">
          <div className="sr-only">Actions</div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowQRModal(true)}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-black/40"
            >
              <QrCode className="h-4 w-4 mr-2" />
              QR Codes
            </Button>
            <Button
              onClick={() => router.push(`/bars/${barId}`)}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-black/40"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={loadBarData}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-black/40"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Live Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {activeSession ? "LIVE" : (barId.startsWith('demo-bar-') ? "ONLINE" : "OFFLINE")}
              </div>
              <div className="text-white/60 text-sm">Status</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {sessions.reduce((sum, s) => sum + s.total_players, 0)}
              </div>
              <div className="text-white/60 text-sm">Total Players</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {waitingSessions.length}
              </div>
              <div className="text-white/60 text-sm">Waiting Sessions</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {games.length}
              </div>
              <div className="text-white/60 text-sm">Available Games</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Setup or Actions */}
        {games.length === 0 ? (
          <div>
            <div className="text-white mb-4">
              Debug: games.length = {games.length}, barId = {barId}
            </div>
            <QuickSetupWizard 
              barId={barId}
              onGameCreated={() => {
                console.log("Game created callback called")
                // Reload data from database
                loadBarData()
              }}
              onSessionCreated={(sessionCode) => {
                console.log("Session created callback called with code:", sessionCode)
                toast.success(`Session created! Join code: ${sessionCode}`)
                // Reload data from database
                loadBarData()
              }}
            />
          </div>
        ) : (
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Play className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create New Session */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="game-select" className="text-white">Select Trivia Game</Label>
                  <Select value={selectedGame} onValueChange={(value) => {
                    console.log("Game selected:", value)
                    setSelectedGame(value)
                  }}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Choose a trivia game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.name} ({game.max_questions} questions, {game.time_per_question}s each)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => setShowStartConfirmation(true)}
                  disabled={!selectedGame || isCreatingSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreatingSession ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start New Session
                </Button>
              </div>

              {/* Join Code Display */}
              {showJoinCode && sessions.length > 0 && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-green-400 font-medium">New Session Created!</h3>
                    <Button
                      onClick={() => setShowJoinCode(false)}
                      variant="ghost"
                      size="sm"
                      className="text-green-400 hover:text-green-300"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80">Join Code:</span>
                      <code className="bg-black/30 px-2 py-1 rounded text-green-400 font-mono text-lg">
                        {sessions[0].session_code}
                      </code>
                      <Button
                        onClick={() => copyJoinCode(sessions[0].session_code)}
                        size="sm"
                        variant="outline"
                        className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/80">Venue Code:</span>
                      <code className="bg-black/30 px-2 py-1 rounded text-green-400 font-mono text-sm flex-1 truncate">
                        {bar?.venue_code || 'N/A'}
                      </code>
                      <Button
                        onClick={() => copyVenueCode(bar?.venue_code || '')}
                        size="sm"
                        variant="outline"
                        className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Sessions */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Live Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No active sessions</p>
                <p className="text-white/40 text-sm">Create a session to start trivia</p>
              </div>
            ) : (
              <div className="space-y-3" key={refreshKey}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      session.status === "active"
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-yellow-500/10 border-yellow-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">Session {session.session_code}</h3>
                          <Badge 
                            variant="outline"
                            className={
                              session.status === "active"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            }
                          >
                            {session.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-white/60 text-sm">
                            <Users className="h-3 w-3" />
                            {session.total_players} players
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-white/60 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {new Date(session.created_at).toLocaleTimeString()}
                          </div>
                          {session.started_at && (
                            <div className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              Started {new Date(session.started_at).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => copyJoinCode(session.session_code)}
                          size="sm"
                          variant="outline"
                          className="bg-gray-800 border-gray-600 text-white hover:bg-black/40"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Code
                        </Button>
                        
                        {session.status === "waiting" && (
                          <>
                            <Button
                              onClick={() => handleStartSession(session.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <StopCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Session</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this session? This action cannot be undone and any players who have joined will be removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Session</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancelSession(session.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Yes, Cancel Session
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        
                        {session.status === "active" && (
                          <>
                            <Button
                              onClick={() => router.push(`/bars/${barId}/session/${session.id}`)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Live
                            </Button>
                            <Button
                              onClick={() => handleEndSession(session.id)}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <StopCircle className="h-3 w-3 mr-1" />
                              End Game
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start Session Confirmation Modal */}
        {showStartConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Confirm New Session</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStartConfirmation(false)}
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Session Details</h3>
                  <div className="space-y-2 text-gray-300 text-sm">
                    <div className="flex justify-between">
                      <span>Game:</span>
                      <span className="text-white">
                        {games.find(g => g.id === selectedGame)?.name || "Unknown Game"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions:</span>
                      <span className="text-white">
                        {games.find(g => g.id === selectedGame)?.max_questions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time per question:</span>
                      <span className="text-white">
                        {games.find(g => g.id === selectedGame)?.time_per_question || 0}s
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-400 text-lg">⚠️</div>
                    <div className="text-yellow-200 text-sm">
                      <p className="font-medium mb-1">Are you sure you want to start this session?</p>
                      <p>This will create a new trivia session that customers can join immediately. Make sure you're ready to host!</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowStartConfirmation(false)}
                    variant="outline"
                    className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setShowStartConfirmation(false)
                      await handleCreateSession()
                    }}
                    disabled={isCreatingSession}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isCreatingSession ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Yes, Start Session
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">QR Codes for {bar.name}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQRModal(false)}
                  className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Close
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QRCodeGenerator
                  barCode={bar.qr_code}
                  barName={bar.name}
                  type="qr"
                />
                <QRCodeGenerator
                  barCode={bar.venue_code}
                  barName={bar.name}
                  type="venue"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </VenuesPageChrome>
  )
}
