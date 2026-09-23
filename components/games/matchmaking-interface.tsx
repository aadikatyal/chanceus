"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Clock, 
  Users, 
  Trophy, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Coins
} from "lucide-react"
import { joinMatchmakingQueue, cancelMatchmakingQueue } from "@/lib/matchmaking-actions"
import MultiplayerMathBlitz from "./multiplayer-math-blitz"
import MathBlitz from "./math-blitz"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface MatchmakingInterfaceProps {
  gameId: string
  currentUserId: string
  matchType: 'free' | 'tokens' | 'cash5' | 'cash10'
  betAmount: number
  category?: string
  onMatchFound?: (matchId: string, matchType: string) => void
  onCancel?: () => void
  autoStart?: boolean
  variant?: "legacy" | "competitive"
}

type MatchmakingStatus = 
  | 'idle' 
  | 'searching' 
  | 'found_live' 
  | 'timeout_priority' 
  | 'playing_priority' 
  | 'completed'

export default function MatchmakingInterface({
  gameId,
  currentUserId,
  matchType,
  betAmount,
  category,
  onMatchFound,
  onCancel,
  autoStart = false,
  variant = "legacy",
}: MatchmakingInterfaceProps) {
  const competitive = variant === "competitive"
  const [status, setStatus] = useState<MatchmakingStatus>('idle')
  const [timeRemaining, setTimeRemaining] = useState(180) // 3 minutes in seconds
  const [queueId, setQueueId] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)
  const isInitialized = useRef(false)
  const supabase = createClientComponentClient()

  // Real-time subscription to listen for new matches
  useEffect(() => {
    if (status === 'searching' && queueId) {
      console.log("🔔 Setting up real-time subscription for match creation...")
      
      const subscription = supabase
        .channel('matchmaking-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `player1_id=eq.${currentUserId}`
          },
          (payload) => {
            console.log("🎯 New match created for player1:", payload.new)
            const newMatch = payload.new as any
            if (newMatch.status === 'in_progress' && newMatch.player2_id) {
              setMatchId(newMatch.id)
              setStatus('found_live')
              onMatchFound?.(newMatch.id, 'matched')
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `player2_id=eq.${currentUserId}`
          },
          (payload) => {
            console.log("🎯 New match created for player2:", payload.new)
            const newMatch = payload.new as any
            if (newMatch.status === 'in_progress' && newMatch.player1_id) {
              setMatchId(newMatch.id)
              setStatus('found_live')
              onMatchFound?.(newMatch.id, 'matched')
            }
          }
        )
        .subscribe()

      return () => {
        console.log("🔕 Cleaning up real-time subscription")
        subscription.unsubscribe()
      }
    }
  }, [status, queueId, currentUserId, supabase, onMatchFound])

  // Timer countdown
  useEffect(() => {
    if (status === 'searching' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - create priority match
            handleTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [status, timeRemaining])

  // Note: We don't cancel the queue on unmount to allow persistence across navigation
  // The queue will be handled by the CreateMatchForm when you return

  const handleTimeout = useCallback(() => {
    setStatus('timeout_priority')
    setTimeRemaining(0)
  }, [])

  // Auto-start matchmaking if autoStart prop is true (only once)
  useEffect(() => {
    console.log("🔍 Auto-start effect triggered:", { autoStart, hasAutoStarted, isInitialized: isInitialized.current })
    if (autoStart && !hasAutoStarted && !isInitialized.current) {
      console.log("🚀 Auto-starting matchmaking")
      setHasAutoStarted(true)
      isInitialized.current = true
      // Start immediately without delay
      startMatchmaking()
    }
  }, [autoStart, hasAutoStarted])

  const startMatchmaking = async () => {
    console.log("🎯 startMatchmaking called, setting status to searching")
    setStatus('searching')
    setTimeRemaining(180)
    setError(null)

    try {
      console.log("🎯 Calling joinMatchmakingQueue...", { category })
      const result = await joinMatchmakingQueue(gameId, betAmount, matchType, category)
      console.log("🎯 joinMatchmakingQueue result:", result)
      
      if (result.error) {
        console.log("❌ Error in joinMatchmakingQueue:", result.error)
        setError(result.error)
        setStatus('idle')
        return
      }

      if (result.matchType === 'matched') {
        // Found a live opponent and created a match
        setMatchId(result.matchId)
        setStatus('found_live')
        onMatchFound?.(result.matchId, 'matched')
      } else if (result.matchType === 'priority_joined') {
        // Found a priority match to join
        setMatchId(result.matchId)
        setStatus('found_live')
        onMatchFound?.(result.matchId, 'priority_joined')
      } else if (result.matchType === 'queue_waiting') {
        // Waiting in queue
        setQueueId(result.queueId)
        // Timer will handle timeout
      }
    } catch (error) {
      console.error('Matchmaking error:', error)
      setError('Failed to start matchmaking')
      setStatus('idle')
    }
  }

  const cancelMatchmaking = async () => {
    console.log('🛑 Cancelling matchmaking...')
    if (queueId) {
      try {
        const result = await cancelMatchmakingQueue(queueId)
        if (result.success) {
          console.log('✅ Successfully cancelled matchmaking queue')
        } else {
          console.error('❌ Failed to cancel queue:', result.error)
        }
      } catch (error) {
        console.error('❌ Cancel error:', error)
      }
    }
    // Call the onCancel callback to go back to the selection page
    onCancel?.()
  }

  const startPriorityGame = () => {
    setStatus('playing_priority')
  }

  const handleGameComplete = (result: any) => {
    setGameResult(result)
    setStatus('completed')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMatchTypeInfo = () => {
    switch (matchType) {
      case 'free':
        return { icon: <Zap className="h-5 w-5" />, name: 'Free Play', color: 'text-green-400' }
      case 'tokens':
        return { icon: <Coins className="h-5 w-5" />, name: 'Token Match', color: 'text-yellow-400' }
      case 'cash5':
        return { icon: <DollarSign className="h-5 w-5" />, name: '$5 Cash Pool', color: 'text-blue-400' }
      case 'cash10':
        return { icon: <DollarSign className="h-5 w-5" />, name: '$10 Cash Pool', color: 'text-purple-400' }
    }
  }

  const matchTypeInfo = getMatchTypeInfo()

  // When match is found, show loading while redirecting
  if (status === 'found_live' && matchId) {
    return (
      <div className={competitive ? "py-8 text-center" : ""}>
        {competitive ? (
          <>
            <div className="chance-play-live-badge mx-auto mb-4 w-fit">
              <span className="chance-play-live-dot" aria-hidden />
              Match found
            </div>
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-[var(--chance-border)] border-t-[var(--chance-brand)]" />
            <p className="chance-text-caption">Heading to lobby…</p>
          </>
        ) : (
          <Card className="w-full max-w-2xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Match found! Redirecting to game...</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (status === 'playing_priority') {
    return (
      <div className="space-y-6">
        <Alert className="bg-blue-500/20 border-blue-500/30 text-blue-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Priority Match Mode:</strong> You're playing solo, but your results will be compared 
            against the next player who joins this pool. Winner takes all!
          </AlertDescription>
        </Alert>
        
        <MathBlitz
          savedGameData={null}
          onGameUpdate={(gameData) => {
            // Save progress for priority match comparison
            console.log('Priority match progress:', gameData)
          }}
        />
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-500 rounded-full">
              <CheckCircle className="h-8 w-8 text-black" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Game Complete!</CardTitle>
          <p className="text-gray-400">Your results have been saved for comparison</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {gameResult && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="text-2xl font-bold text-orange-500">{gameResult.finalScore}</h3>
                <p className="text-gray-400">Final Score</p>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="text-2xl font-bold text-green-500">{gameResult.problemsSolved}/10</h3>
                <p className="text-gray-400">Problems Solved</p>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="text-2xl font-bold text-blue-500">{gameResult.accuracy}%</h3>
                <p className="text-gray-400">Accuracy</p>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="text-2xl font-bold text-purple-500">{gameResult.streak}</h3>
                <p className="text-gray-400">Best Streak</p>
              </div>
            </div>
          )}
          
          <Alert className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400">
            <Trophy className="h-4 w-4" />
            <AlertDescription>
              <strong>Priority Match:</strong> Your results are saved! The next player who joins 
              this pool will be automatically matched against you. Check back later for results!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const shellClass = competitive
    ? "space-y-6"
    : "w-full max-w-2xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm"
  const Shell = competitive ? "div" : Card
  const Body = competitive ? "div" : CardContent
  const Head = competitive ? "div" : CardHeader

  return (
    <Shell className={shellClass}>
      <Head className={competitive ? "text-center" : "text-center"}>
        {competitive ? (
          <>
            <div className="chance-play-live-badge mx-auto mb-3 w-fit">
              <span className="chance-play-live-dot" aria-hidden />
              In queue
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Finding your opponent</h2>
            <p className="chance-text-caption mt-1">Stay on this screen — we&apos;ll route you when someone matches.</p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-500 rounded-full">
                <Users className="h-8 w-8 text-black" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">Matchmaking</CardTitle>
            <p className="text-gray-400 text-lg">Find your perfect opponent!</p>
          </>
        )}
      </Head>

      <Body className="space-y-6">
        {/* Match Type Display */}
        <div className="text-center">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800/50 ${matchTypeInfo.color}`}>
            {matchTypeInfo.icon}
            <span className="font-semibold">{matchTypeInfo.name}</span>
          </div>
          {betAmount > 0 && (
            <p className="text-gray-400 mt-2">{betAmount.toLocaleString()} tokens</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Matchmaking Status */}
        {status === 'searching' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                <div
                  className={`size-6 animate-spin rounded-full border-2 border-t-transparent ${competitive ? "border-[var(--chance-brand)]" : "border-b-2 border-orange-500"}`}
                />
                <span className={competitive ? "font-semibold" : "text-white font-semibold"}>
                  Searching…
                </span>
              </div>

              <div
                className={`chance-text-mono mb-2 text-3xl font-bold tabular-nums ${competitive ? "text-[var(--chance-brand)]" : "text-orange-500"}`}
              >
                {formatTime(timeRemaining)}
              </div>
              <p className={competitive ? "chance-text-caption" : "text-gray-400"}>Time remaining</p>
            </div>

            <Progress value={((180 - timeRemaining) / 180) * 100} className="h-2" />

            <div className="space-y-2 text-center">
              <p className={competitive ? "text-sm text-[var(--chance-fg)]" : "text-gray-300"}>
                We&apos;ll search up to 3 minutes for a live opponent
              </p>
              <p className={competitive ? "chance-text-caption" : "text-sm text-gray-400"}>
                No match in time? You&apos;ll enter priority mode for the next player in this pool.
              </p>
            </div>

            {competitive ? (
              <button
                type="button"
                onClick={cancelMatchmaking}
                className="chance-secondary-btn chance-focus-ring w-full py-2.5 text-sm"
              >
                Leave queue
              </button>
            ) : (
              <Button
                onClick={cancelMatchmaking}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel Search
              </Button>
            )}
          </div>
        )}

        {/* Timeout Priority Match */}
        {status === 'timeout_priority' && (
          <div className="space-y-4">
            <Alert className="bg-blue-500/20 border-blue-500/30 text-blue-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>No live opponent found!</strong> You can now play solo, and your results 
                will be saved as a "priority match" for the next player to join.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Priority Match Benefits</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Play immediately without waiting</li>
                  <li>• Next player automatically matched against you</li>
                  <li>• Winner takes all tokens</li>
                  <li>• Fair comparison of results</li>
                </ul>
              </div>

              <Button 
                onClick={startPriorityGame}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 text-lg"
              >
                Start Priority Match
              </Button>
            </div>
          </div>
        )}

        {/* Auto-starting loading state - only show if not cancelled */}
        {status === 'idle' && autoStart && hasAutoStarted && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
              <p className="text-gray-300">
                Starting matchmaking...
              </p>
            </div>
          </div>
        )}

        {/* Start Matchmaking - show if not auto-starting OR if user cancelled */}
        {status === 'idle' && (!autoStart || !hasAutoStarted) && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-300">
                Ready to compete? We'll find you the perfect opponent!
              </p>
              <p className="text-sm text-gray-400">
                Live head-to-head play is always attempted first
              </p>
            </div>

            <Button 
              onClick={startMatchmaking}
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
            >
              <Users className="mr-2 h-5 w-5" />
              Find Opponent
            </Button>
          </div>
        )}
      </Body>
    </Shell>
  )
}
