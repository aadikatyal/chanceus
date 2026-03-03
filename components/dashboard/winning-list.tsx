"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Trophy, Clock } from 'lucide-react'

interface Winner {
  id: string
  username: string
  display_name: string
  amount: number
  won_at: string
  game_name: string
}

export default function WinningList() {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentWinners = async () => {
      try {
        // Fetch recent completed matches with winners
        const { data: matchesData, error } = await supabase
          .from("matches")
          .select(`
            id,
            bet_amount,
            completed_at,
            winner_id,
            games (name),
            winner:users!matches_winner_id_fkey (id, username, display_name)
          `)
          .eq("status", "completed")
          .not("winner_id", "is", null)
          .order("completed_at", { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching winners:', error)
          setWinners([])
        } else if (matchesData) {
          const formattedWinners: Winner[] = matchesData.map((match: any) => ({
            id: match.id,
            username: match.winner?.username || 'Unknown',
            display_name: match.winner?.display_name || match.winner?.username || 'Unknown',
            amount: match.bet_amount * 2, // Winner gets both bets
            won_at: match.completed_at,
            game_name: match.games?.name || 'Unknown Game'
          }))
          setWinners(formattedWinners)
        }
      } catch (error) {
        console.error('Error fetching winners:', error)
        setWinners([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentWinners()
    
    // Set up realtime subscription for new completed matches
    const subscription = supabase
      .channel('global-winners')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.completed'
        },
        () => {
          fetchRecentWinners()
        }
      )
      .subscribe()
    
    // Also poll every 30 seconds as backup (realtime handles immediate updates)
    const interval = setInterval(fetchRecentWinners, 30000)
    
    return () => {
      supabase.removeChannel(subscription)
      clearInterval(interval)
    }
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const past = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
    
    // Handle negative time (future dates)
    if (diffInSeconds < 0) return 'Just now'
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="h-4 bg-gray-700 rounded w-20"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {winners.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-4">
          No recent winners
        </div>
      ) : (
        winners.map((winner) => (
          <div key={winner.id} className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                {winner.display_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-medium truncate">{winner.display_name}</div>
                <div className="text-xs text-gray-400 truncate">{winner.game_name}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className="flex items-center justify-end text-green-400 text-sm font-semibold">
                <Trophy className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>{winner.amount} tokens</span>
              </div>
              <div className="flex items-center justify-end text-gray-400 text-xs">
                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>{formatTimeAgo(winner.won_at)}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
