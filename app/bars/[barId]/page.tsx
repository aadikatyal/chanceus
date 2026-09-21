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
  Plus, 
  Settings, 
  QrCode, 
  Users, 
  Trophy, 
  Clock, 
  Play, 
  Pause,
  BarChart3,
  MapPin,
  Phone,
  Globe
} from "lucide-react"
import { toast } from "sonner"
import QRCodeGenerator from "@/components/bar/qr-code-generator"
import DrinkRewardsManager from "@/components/bar/drink-rewards-manager"
import StaffManagement from "@/components/bar/staff-management"
import Header from "@/components/navigation/header"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/supabase/client"
import { 
  getBarById, 
  createBarTriviaGame, 
  getBarTriviaGames, 
  createBarTriviaSession,
  getActiveBarSessions,
  startBarTriviaSession
} from "@/lib/bar-actions"
import type { Bar, BarTriviaGame, BarTriviaSession } from "@/lib/bar-actions"

export default function BarManagementPage() {
  const params = useParams()
  const router = useRouter()
  const barId = params.barId as string

  const [bar, setBar] = useState<Bar | null>(null)
  const [games, setGames] = useState<BarTriviaGame[]>([])
  const [sessions, setSessions] = useState<BarTriviaSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [selectedGame, setSelectedGame] = useState<string>("")

  useEffect(() => {
    // Load user
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Fetch user data from database to get actual token balance
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          if (userData && !error) {
            // Use data from database
            setUser(userData)
          } else {
            // Fallback to auth user with default values
            const user: User = {
              id: authUser.id,
              username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
              email: authUser.email || '',
              display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
              avatar_url: authUser.user_metadata?.avatar_url || null,
              tokens: 0,
              total_games_played: 0,
              total_games_won: 0,
              win_rate: 0,
              created_at: authUser.created_at,
              updated_at: authUser.updated_at || authUser.created_at
            }
            setUser(user)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          // Fallback to auth user with default values
          const user: User = {
            id: authUser.id,
            username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
            email: authUser.email || '',
            display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            tokens: 0,
            total_games_played: 0,
            total_games_won: 0,
            win_rate: 0,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || authUser.created_at
          }
          setUser(user)
        }
      }
    }
    
    loadUser()
    
    if (barId) {
      loadBarData()
    }
  }, [barId])

  const loadBarData = async () => {
    try {
      // Load bar info
      const barData = await getBarById(barId)
      
      if (barData) {
        setBar(barData)
        
        // Load games and sessions
        const [gamesData, sessionsData] = await Promise.all([
          getBarTriviaGames(barId),
          getActiveBarSessions(barId)
        ])
        
        setGames(gamesData || [])
        setSessions(sessionsData || [])
      } else {
        // If no bar data from database, try localStorage fallback
        console.log("No bar data from database, trying localStorage fallback")
        const demoBarData = localStorage.getItem('demoBar')
        if (demoBarData) {
          const demoBar = JSON.parse(demoBarData)
          setBar({
            id: demoBar.id,
            name: demoBar.name,
            qr_code: demoBar.qr_code,
            venue_code: demoBar.venue_code,
            description: demoBar.description || "Demo bar for testing",
            address: demoBar.address || "123 Demo Street",
            city: demoBar.city || "Demo City",
            state: demoBar.state || "DC",
            zip_code: demoBar.zip_code || "12345",
            phone: demoBar.phone || "(555) 123-4567",
            email: demoBar.email || "demo@bar.com",
            website: demoBar.website || "https://demo-bar.com",
            is_active: true,
            created_at: demoBar.created_at || new Date().toISOString(),
            updated_at: demoBar.updated_at || new Date().toISOString()
          })
          setGames([])
          setSessions([])
          return
        }
        
        toast.error("Bar not found")
      }
    } catch (error) {
      console.error("Error loading bar data:", error)
      
      // If database fails, try localStorage fallback (for demo bars)
      const demoBarData = localStorage.getItem('demoBar')
      if (demoBarData) {
        const demoBar = JSON.parse(demoBarData)
        setBar({
          id: demoBar.id,
          name: demoBar.name,
          qr_code: demoBar.qr_code,
          venue_code: demoBar.venue_code,
          description: demoBar.description || "Demo bar for testing",
          address: demoBar.address || "123 Demo Street",
          city: demoBar.city || "Demo City",
          state: demoBar.state || "DC",
          zip_code: demoBar.zip_code || "12345",
          phone: demoBar.phone || "(555) 123-4567",
          email: demoBar.email || "demo@bar.com",
          website: demoBar.website || "https://demo-bar.com",
          is_active: true,
          created_at: demoBar.created_at || new Date().toISOString(),
          updated_at: demoBar.updated_at || new Date().toISOString()
        })
        setGames([])
        setSessions([])
        return
      }
      
      toast.error("Failed to load bar data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      const formData = new FormData(e.currentTarget)
      
      // Check if this is a demo bar (stored in localStorage)
      const demoBarData = localStorage.getItem('demoBar')
      if (demoBarData) {
        // Create mock game for demo bar
        const mockGame = {
          id: `game-${Date.now()}`,
          bar_id: barId,
          name: formData.get("name") as string,
          description: formData.get("description") as string || "",
          max_questions: parseInt(formData.get("max_questions") as string) || 10,
          time_per_question: parseInt(formData.get("time_per_question") as string) || 30,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        setGames(prev => [mockGame, ...prev])
        setShowCreateGame(false)
        toast.success("Demo trivia game created successfully!")
        return
      }
      
      // Try database creation for real bars
      const game = await createBarTriviaGame(barId, formData)
      setGames(prev => [game, ...prev])
      setShowCreateGame(false)
      toast.success("Trivia game created successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to create game")
    }
  }

  const handleCreateSession = async (gameId: string) => {
    try {
      // Check if this is a demo bar (stored in localStorage)
      const demoBarData = localStorage.getItem('demoBar')
      if (demoBarData) {
        // Create mock session for demo bar
        const mockSession = {
          id: `session-${Date.now()}`,
          bar_id: barId,
          game_id: gameId,
          session_code: `DEMO${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          status: "waiting" as const,
          max_participants: 50,
          current_participants: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        setSessions(prev => [mockSession, ...prev])
        toast.success("Demo trivia session created!")
        return
      }
      
      // Try database creation for real bars
      const session = await createBarTriviaSession(barId, gameId)
      setSessions(prev => [session, ...prev])
      toast.success("Trivia session created!")
    } catch (error: any) {
      toast.error("Failed to create session")
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      // Check if this is a demo bar (stored in localStorage)
      const demoBarData = localStorage.getItem('demoBar')
      if (demoBarData) {
        // Update session status for demo bar
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: "active" as const }
            : session
        ))
        toast.success("Demo session started!")
        return
      }
      
      // Try database update for real bars
      await startBarTriviaSession(sessionId)
      await loadBarData() // Reload to get updated session status
      toast.success("Session started!")
    } catch (error: any) {
      toast.error("Failed to start session")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading bar management...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!bar) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Bar Not Found</h2>
            <p className="text-gray-300 mb-4">The bar you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/bars")} className="bg-orange-600 hover:bg-orange-700 text-white">
              Back to My Bars
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      
      {/* Subtle gradient overlay */}
      
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white">{bar.name}</h1>
              <p className="text-gray-300 mt-2">Bar Management Dashboard</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push(`/bars/${barId}/dashboard`)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Live Dashboard
              </Button>
              <Button
                onClick={() => setShowQRModal(true)}
                variant="outline"
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Codes
              </Button>
              <Button
                onClick={() => setShowCreateGame(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Game
              </Button>
            </div>
          </div>

          {/* Bar Info */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Bar Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">Basic Info</h3>
                    <div className="space-y-2 text-gray-300">
                      {bar.description && <p>{bar.description}</p>}
                      {bar.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{bar.address}</span>
                        </div>
                      )}
                      {bar.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{bar.phone}</span>
                        </div>
                      )}
                      {bar.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <a 
                            href={bar.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-white underline truncate"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">Access Codes</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <span className="text-gray-300">QR Code</span>
                        <code className="text-white font-mono">{bar.qr_code}</code>
                      </div>
                      <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <span className="text-gray-300">Venue Code</span>
                        <code className="text-white font-mono">{bar.venue_code}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">No active sessions</p>
                  <p className="text-gray-400 text-sm">Create a game and start a session to begin</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                      <div>
                        <div className="text-white font-medium">Session {session.session_code}</div>
                        <div className="flex items-center gap-4 text-gray-300 text-sm mt-1">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.current_participants || 0} players
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {session.status === "waiting" && (
                          <Button
                            onClick={() => handleStartSession(session.id)}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {session.status === "active" && (
                          <Button
                            onClick={() => router.push(`/bars/${barId}/session/${session.id}`)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Management */}
          <StaffManagement barId={barId} />

          {/* Drink Rewards */}
          <DrinkRewardsManager barId={barId} />

          {/* Trivia Games */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Trivia Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {games.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">No trivia games yet</p>
                  <p className="text-gray-400 text-sm">Create your first trivia game to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <div key={game.id} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{game.name}</div>
                        <div className="text-gray-300 text-sm">{game.description}</div>
                        <div className="flex items-center gap-4 text-gray-400 text-xs mt-1">
                          <span>{game.max_questions} questions</span>
                          <span>{game.time_per_question}s per question</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCreateSession(game.id)}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Session
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Game Modal */}
          {showCreateGame && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-semibold text-white mb-4">Create New Trivia Game</h2>
                <form onSubmit={handleCreateGame} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Game Name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-300">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_questions" className="text-gray-300">Max Questions</Label>
                      <Input
                        id="max_questions"
                        name="max_questions"
                        type="number"
                        defaultValue={10}
                        min={1}
                        max={50}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time_per_question" className="text-gray-300">Time per Question (s)</Label>
                      <Input
                        id="time_per_question"
                        name="time_per_question"
                        type="number"
                        defaultValue={30}
                        min={10}
                        max={120}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateGame(false)}
                      className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Create Game
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* QR Code Modal */}
          {showQRModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
      </div>
    </div>
  )
}