"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Clock, TrendingUp, Eye } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

interface Match {
  id: string
  game: string
  opponent: string
  result: "won" | "lost" | "draw"
  tokens: number
  duration: string
  timestamp: string
  match_id: string
}

export default function RecentMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentMatches = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Fetch user's recent matches
        const { data: matchesData, error } = await supabase
          .from("matches")
          .select(`
            id,
            player1_id,
            player2_id,
            bet_amount,
            status,
            winner_id,
            started_at,
            completed_at,
            created_at,
            games (name),
            player1:users!matches_player1_id_fkey (id, username, display_name),
            player2:users!matches_player2_id_fkey (id, username, display_name)
          `)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(5)

        if (error) {
          console.error("Error fetching matches:", error)
          setMatches([])
        } else if (matchesData) {
          const formattedMatches: Match[] = matchesData.map((match: any) => {
            // Check which player the current user is using the raw IDs
            const isPlayer1 = match.player1_id === user.id
            const isPlayer2 = match.player2_id === user.id
            
            // Get the opponent (the player who is NOT the current user)
            const opponent = isPlayer1 ? match.player2 : (isPlayer2 ? match.player1 : null)
            const opponentName = opponent?.display_name || opponent?.username || "Unknown"
            const gameName = match.games?.name || "Unknown Game"
            
            // Determine result
            let result: "won" | "lost" | "draw" = "draw"
            let tokens = 0
            
            if (match.winner_id === user.id) {
              result = "won"
              tokens = match.bet_amount * 2 // Won both bets
            } else if (match.winner_id && match.winner_id !== user.id) {
              result = "lost"
              tokens = -match.bet_amount // Lost bet
            }

            // Calculate duration
            let duration = "N/A"
            if (match.started_at && match.completed_at) {
              const start = new Date(match.started_at)
              const end = new Date(match.completed_at)
              const diffMs = end.getTime() - start.getTime()
              const diffMins = Math.floor(diffMs / 60000)
              const diffSecs = Math.floor((diffMs % 60000) / 1000)
              duration = `${diffMins}m ${diffSecs}s`
            }

            // Format timestamp
            const completedAt = new Date(match.completed_at)
            const now = new Date()
            const diffMs = now.getTime() - completedAt.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)
            
            let timestamp = "Just now"
            if (diffDays > 0) {
              timestamp = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
            } else if (diffHours > 0) {
              timestamp = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
            } else if (diffMins > 0) {
              timestamp = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
            }

            return {
              id: match.id,
              match_id: match.id,
              game: gameName,
              opponent: opponentName,
              result,
              tokens,
              duration,
              timestamp,
            }
          })

          setMatches(formattedMatches)
        }
      } catch (error) {
        console.error("Error fetching recent matches:", error)
        setMatches([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentMatches()
    
    // Set up realtime subscription for new completed matches
    const subscription = supabase
      .channel('user-matches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.completed'
        },
        () => {
          fetchRecentMatches()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Recent Matches</CardTitle>
            <CardDescription className="text-gray-400">Your latest gaming activity</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Recent Matches</CardTitle>
          <CardDescription className="text-gray-400">Your latest gaming activity</CardDescription>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:text-white bg-transparent"
        >
          <Link href="/matches">
            <Eye className="mr-2 h-4 w-4" />
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No recent matches</p>
            <p className="text-sm mt-2">Start playing to see your match history here!</p>
          </div>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${match.result === "won" ? "bg-green-500/20" : match.result === "lost" ? "bg-red-500/20" : "bg-gray-500/20"}`}>
                  {match.result === "won" ? (
                    <Trophy className="h-4 w-4 text-green-400" />
                  ) : match.result === "lost" ? (
                    <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{match.game}</span>
                    <Badge
                      variant={match.result === "won" ? "default" : match.result === "lost" ? "destructive" : "secondary"}
                      className={match.result === "won" ? "bg-green-500/20 text-green-400" : match.result === "lost" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}
                    >
                      {match.result}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">vs {match.opponent}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${match.tokens > 0 ? "text-green-400" : match.tokens < 0 ? "text-red-400" : "text-gray-400"}`}>
                  {match.tokens > 0 ? "+" : ""}
                  {match.tokens} tokens
                </div>
                <div className="text-sm text-gray-400 flex items-center justify-end">
                  <Clock className="h-3 w-3 mr-1" />
                  {match.duration} • {match.timestamp}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
