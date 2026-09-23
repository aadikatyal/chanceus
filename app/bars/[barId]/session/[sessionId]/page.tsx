"use client"

import React, { useState, useEffect } from "react"
import QRCode from "react-qr-code"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Play, 
  Pause, 
  Square, 
  Users, 
  Trophy, 
  Clock, 
  ArrowLeft,
  RefreshCw,
  Eye,
  Copy,
  Download,
  BarChart3,
  Volume2,
  VolumeX,
  QrCode
} from "lucide-react"
import { toast } from "sonner"
import { 
  getBarByCode, 
  getActiveBarSessions,
  getSessionParticipants,
  startBarTriviaSession
} from "@/lib/bar-actions"
import type { Bar, BarTriviaSession, BarTriviaParticipant } from "@/lib/bar-actions"
import VenuesPageChrome from "@/components/venues/venues-page-chrome"
import type { User } from "@/lib/supabase/client"

export default function LiveSessionPage() {
  const params = useParams()
  const router = useRouter()
  const barId = params.barId as string
  const sessionId = params.sessionId as string

  const [bar, setBar] = useState<Bar | null>(null)
  const [session, setSession] = useState<BarTriviaSession | null>(null)
  const [participants, setParticipants] = useState<BarTriviaParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Clean QR Code component using react-qr-code library
  const QRCodeComponent = ({ value, size = 200 }: { value: string; size?: number }) => {
    if (!value) {
      return (
        <div className="flex items-center justify-center w-48 h-48 bg-gray-100 rounded-lg border-2 border-gray-300">
          <p className="text-gray-600 text-sm">No code to display</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
          <QRCode
            value={value}
            size={size}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 ${size} ${size}`}
          />
        </div>
      </div>
    )
  }

  useEffect(() => {
    // Load user data
    const loadUser = async () => {
      const { createClient } = await import("@/lib/supabase/client")
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

    if (barId && sessionId) {
      loadSessionData()
    }
  }, [barId, sessionId])

  useEffect(() => {
    if (autoRefresh && session?.status === "active") {
      const interval = setInterval(() => {
        loadSessionData()
      }, 2000) // Refresh every 2 seconds for live updates

      return () => clearInterval(interval)
    }
  }, [autoRefresh, session?.status])

  const loadSessionData = async () => {
    try {
      console.log("Loading session data for barId:", barId, "sessionId:", sessionId)
      
      // Load bar data directly by ID (not code)
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      
      const { data: barData, error: barError } = await supabase
        .from("bars")
        .select("*")
        .eq("id", barId)
        .single()
      
      if (barError || !barData) {
        console.error("Bar not found:", barError)
        toast.error("Bar not found")
        router.push(`/bars/${barId}/dashboard`)
        return
      }
      
      // Load sessions for this bar
      const sessionsData = await getActiveBarSessions(barId)
      console.log("Sessions data:", sessionsData)
      
      const currentSession = sessionsData.find(s => s.id === sessionId)
      if (!currentSession) {
        console.error("Session not found in sessions list:", sessionId)
        toast.error("Session not found")
        router.push(`/bars/${barId}/dashboard`)
        return
      }

      setBar(barData)
      setSession(currentSession)

      // Load participants
      const participantsData = await getSessionParticipants(sessionId)
      setParticipants(participantsData)
    } catch (error) {
      console.error("Error loading session data:", error)
      toast.error("Failed to load session data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartSession = async () => {
    try {
      await startBarTriviaSession(sessionId)
      await loadSessionData()
      toast.success("Session started!")
    } catch (error: any) {
      toast.error(error.message || "Failed to start session")
    }
  }

  const handleEndSession = async () => {
    if (!confirm("Are you sure you want to end this session? This cannot be undone.")) {
      return
    }

    try {
      // This would typically call an end session API
      toast.success("Session ended")
      router.push(`/bars/${barId}/dashboard`)
    } catch (error: any) {
      toast.error(error.message || "Failed to end session")
    }
  }

  const downloadQRCode = async () => {
    try {
      const url = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/bar/join?code=${bar?.venue_code}`
      
      // Create a temporary canvas to generate the QR code
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // Set canvas size
      canvas.width = 300
      canvas.height = 300
      
      // Create a temporary div to render the QR code
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '300px'
      tempDiv.style.height = '300px'
      document.body.appendChild(tempDiv)
      
      // Create QR code using the same component
      const QRCodeElement = document.createElement('div')
      tempDiv.appendChild(QRCodeElement)
      
      // Use react-qr-code to generate the QR code
      const { default: QRCode } = await import('react-qr-code')
      const React = await import('react')
      const ReactDOM = await import('react-dom/client')
      
      const root = ReactDOM.createRoot(QRCodeElement)
      root.render(React.createElement(QRCode, {
        value: url,
        size: 300,
        style: { height: "auto", maxWidth: "100%", width: "100%" }
      }))
      
      // Wait for the QR code to render
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get the SVG element
      const svgElement = QRCodeElement.querySelector('svg')
      if (!svgElement) {
        throw new Error('Failed to generate QR code')
      }
      
      // Convert SVG to canvas
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const img = new Image()
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url_svg = URL.createObjectURL(svgBlob)
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 300, 300)
        
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `${bar?.name || 'bar'}-qr-code.png`
            link.href = downloadUrl
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(downloadUrl)
            toast.success("QR code downloaded!")
          }
        })
        
        // Cleanup
        document.body.removeChild(tempDiv)
        URL.revokeObjectURL(url_svg)
      }
      
      img.src = url_svg
    } catch (error) {
      console.error('Error downloading QR code:', error)
      toast.error("Failed to download QR code")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] relative chance-competitive-theme flex items-center justify-center p-4">
        {/* Subtle gradient overlay */}
        
        
        <Card className="w-full max-w-md bg-gray-900/80 border-gray-800 relative z-10">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading session...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session || !bar) {
    return (
      <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] relative chance-competitive-theme flex items-center justify-center p-4">
        {/* Subtle gradient overlay */}
        
        
        <Card className="w-full max-w-md bg-gray-900/80 border-gray-800 relative z-10">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Session Not Found</h2>
            <p className="text-white/60 mb-4">This session doesn't exist or has ended.</p>
            <Button onClick={() => router.push(`/bars/${barId}/dashboard`)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score)
  const isActive = session.status === "active"

  return (
    <VenuesPageChrome user={user}>
      
      
      {/* Subtle gradient overlay */}
      
      
      <div className="max-w-6xl mx-auto p-4 pt-8 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/bars/${barId}/dashboard`)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="chance-hero-title text-2xl sm:text-3xl">{bar.name}</h1>
              <p className="text-white/80 mt-1">Session {session.session_code}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl">QR Codes for {bar?.name}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-6 mt-4">
                  {/* Single QR Code Section */}
                  <div className="space-y-6 w-full max-w-md">
                    <div className="flex items-center justify-center gap-2">
                      <QrCode className="h-6 w-6 text-blue-400" />
                      <h3 className="text-white font-medium text-xl">Join Trivia</h3>
                    </div>
                    
                    {/* QR Code Display */}
                    {bar?.venue_code && (
                      <div className="flex justify-center">
                        <QRCodeComponent 
                          value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/bar/join?code=${bar.venue_code}`} 
                          size={250} 
                        />
                      </div>
                    )}
                    
                    <p className="text-white/70 text-sm text-center">
                      Customers scan this QR code to join trivia at {bar?.name}
                    </p>
                    
                    {/* Join URL */}
                    <div>
                      <label className="text-white/70 text-sm">Join URL</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/bar/join?code=${bar?.venue_code || ''}`}
                          readOnly
                          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white font-mono flex-1 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/bar/join?code=${bar?.venue_code || ''}`
                            navigator.clipboard.writeText(joinUrl)
                            toast.success("Join URL copied!")
                          }}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Venue Code for Manual Entry */}
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2 text-center">Manual Entry</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={bar?.venue_code || 'N/A'}
                          readOnly
                          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono flex-1 text-center text-lg"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(bar?.venue_code || '')
                            toast.success("Venue code copied!")
                          }}
                          className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-white/60 text-xs text-center mt-2">
                        Customers can also enter this code manually
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadQRCode}
                        className="flex-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download QR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/bar/join?code=${bar?.venue_code}`
                          navigator.clipboard.writeText(url)
                          toast.success("Join URL copied!")
                        }}
                        className="flex-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-white font-medium mb-2">For customers:</h4>
                  <ul className="text-white/70 text-sm space-y-1">
                    <li>• Scan QR code or visit the URL</li>
                    <li>• Enter the venue code: <span className="text-green-400 font-mono">{bar?.venue_code || 'N/A'}</span></li>
                    <li>• Join trivia games and compete for drinks!</li>
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="outline"
              className={`${autoRefresh ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/10 border-white/30 text-white'} hover:bg-white/20`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            
            <Button
              onClick={() => setIsMuted(!isMuted)}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Session Status */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${isActive ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isActive ? 'LIVE' : 'WAITING'}
                  </div>
                  <div className="text-white/60 text-sm">Status</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{participants.length}</div>
                  <div className="text-white/60 text-sm">Players</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {session.total_players}
                  </div>
                  <div className="text-white/60 text-sm">Total Joined</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!isActive && (
                  <Button
                    onClick={handleStartSession}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                )}
                
                {isActive && (
                  <Button
                    onClick={handleEndSession}
                    variant="outline"
                    className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Leaderboard */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Live Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No players yet</p>
                <p className="text-white/40 text-sm">Players will appear here when they join</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedParticipants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                      index === 0 
                        ? "bg-yellow-500/20 border border-yellow-500/30" 
                        : index === 1
                        ? "bg-gray-400/20 border border-gray-400/30"
                        : index === 2
                        ? "bg-orange-500/20 border border-orange-500/30"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 
                          ? "bg-yellow-500 text-yellow-900" 
                          : index === 1
                          ? "bg-gray-400 text-gray-900"
                          : index === 2
                          ? "bg-orange-500 text-orange-900"
                          : "bg-white/20 text-white"
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div>
                        <div className="text-white font-medium text-lg">
                          {participant.display_name}
                        </div>
                        <div className="text-white/60 text-sm">
                          {participant.correct_answers}/{participant.questions_answered} correct
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-white font-bold text-2xl">
                        {participant.score}
                      </div>
                      <div className="text-white/60 text-sm">
                        {participant.average_response_time.toFixed(1)}s avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Controls */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              How Customers Join
            </CardTitle>
            <p className="text-white/70 text-sm">
              Customers must be physically at the bar to join this trivia session
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-400" />
                  Venue Code
                </h3>
                <p className="text-white/60 text-sm mb-3">
                  Customers scan the QR code at the bar or enter this code manually
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-800 px-3 py-2 rounded text-green-400 font-mono text-xl flex-1">
                    {bar?.venue_code || 'N/A'}
                  </code>
                  <Button
                    onClick={() => {
                    navigator.clipboard.writeText(bar?.venue_code || '')
                    toast.success("Venue code copied!")
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                >
                  Copy
                </Button>
                </div>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-400" />
                  Session Code
                </h3>
                <p className="text-white/60 text-sm mb-3">
                  This specific trivia session code for today's game
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-800 px-3 py-2 rounded text-blue-400 font-mono text-sm flex-1 truncate">
                    {session.session_code}
                  </code>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(session.session_code)
                      toast.success("Session code copied!")
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  Session Info
                </h3>
                <div className="space-y-2 text-white/80 text-sm">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(session.created_at).toLocaleTimeString()}</span>
                  </div>
                  {session.started_at && (
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span>{new Date(session.started_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-400">{session.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span className="text-yellow-400">{participants.length}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Instructions for customers */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Instructions for Customers
              </h4>
              <div className="text-blue-300 text-sm space-y-1">
                <div>1. Come to <strong>{bar?.name}</strong> to join</div>
                <div>2. Scan the QR code at the bar or enter venue code: <code className="bg-blue-900/30 px-1 rounded">{bar?.venue_code}</code></div>
                <div>3. Enter session code: <code className="bg-blue-900/30 px-1 rounded">{session.session_code}</code></div>
                <div>4. Start playing trivia and compete for drinks!</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VenuesPageChrome>
  )
}
