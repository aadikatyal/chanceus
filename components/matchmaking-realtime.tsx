"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import MatchmakingQueueList from './games/matchmaking-queue-list'

interface MatchmakingQueue {
  id: string
  game_id: string
  bet_amount: number
  match_type: string
  expires_at: string
  created_at: string
  games: {
    name: string
  }
  users: {
    username: string
    display_name?: string
    avatar_url?: string
  }
}

interface MatchmakingRealtimeProps {
  initialQueues: MatchmakingQueue[]
  currentUserId: string
  variant?: "legacy" | "competitive"
}

export default function MatchmakingRealtime({
  initialQueues,
  currentUserId,
  variant = "legacy",
}: MatchmakingRealtimeProps) {
  const [queues, setQueues] = useState<MatchmakingQueue[]>(initialQueues)

  useEffect(() => {
    console.log("🔄 Setting up matchmaking queue real-time updates")

    // Set up real-time subscription for matchmaking_queue changes
    const subscription = supabase
      .channel('matchmaking-queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'matchmaking_queue'
        },
        (payload) => {
          console.log('🔄 Matchmaking queue change detected:', payload)
          
          // Refresh the queues when any change occurs
          refreshQueues()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'matches'
        },
        (payload) => {
          console.log('🔄 Match change detected:', payload)
          
          // Refresh the queues when matches change (cancelled, completed, etc.)
          refreshQueues()
        }
      )
      .subscribe((status) => {
        console.log('🔄 Matchmaking subscription status:', status)
      })

    // Also poll every 2 seconds as backup (more aggressive)
    const pollInterval = setInterval(refreshQueues, 2000)

    return () => {
      console.log("🧹 Cleaning up matchmaking real-time subscription")
      subscription.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [currentUserId])

  const refreshQueues = async () => {
    try {
      console.log("🔄 Refreshing matchmaking queues...")
      
      // First, let's see ALL queue entries for debugging
      const { data: allQueues } = await supabase
        .from("matchmaking_queue")
        .select("id, status, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20)
      
      console.log("🔍 All queue entries in database:", allQueues)

      // Try a simpler approach - fetch queues first, then users separately
      const { data: updatedQueues, error } = await supabase
        .from("matchmaking_queue")
        .select(`
          id,
          game_id,
          bet_amount,
          match_type,
          expires_at,
          created_at,
          status,
          user_id,
          games (name)
        `)
        .eq("status", "waiting")
        .neq("user_id", currentUserId) // Don't show user's own queue entries
        .gt("expires_at", new Date().toISOString()) // Only show non-expired entries
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        console.error("❌ Error refreshing matchmaking queues:", error)
        return
      }

      // Manually fetch user data using server-side client
      const queuesWithUsers = await Promise.all(
        (updatedQueues || []).map(async (queue) => {
          try {
            // The users table exists, let's try a different approach
            let userData = null
            let userError = null
            
            // Try to query the users table first (RLS might allow it now)
            console.log('🔍 Querying users table for:', queue.user_id)
            
            const { data: usersData, error: usersError } = await supabase
              .from("users")
              .select("username, display_name, avatar_url")
              .eq("id", queue.user_id)
              .maybeSingle()
            
            console.log('🔍 Users query result:', { usersData, usersError })
            
            if (usersData && !usersError) {
              console.log('✅ Found user in users table:', usersData)
            } else {
              console.log('❌ User not found in users table, using fallback')
              // Fallback to a more user-friendly format
              usersData = {
                username: `player_${queue.user_id.slice(0, 8)}`,
                display_name: `Player ${queue.user_id.slice(0, 8)}`,
                avatar_url: null
              }
            }
            
            // Set the user data (either from auth or fallback)
            userData = usersData
            console.log('✅ Final user data:', userData)
            
            return {
              ...queue,
              users: userData
            }
          } catch (error) {
            console.error('❌ Exception fetching user data:', error)
            return {
              ...queue,
              users: null
            }
          }
        })
      )

      console.log("✅ Updated matchmaking queues with users:", queuesWithUsers?.length || 0, queuesWithUsers)
      console.log("🔍 First queue user data:", queuesWithUsers?.[0]?.users)
      console.log("🔍 Full first queue object:", JSON.stringify(queuesWithUsers?.[0], null, 2))
      setQueues(queuesWithUsers || [])
    } catch (error) {
      console.error("❌ Error in refreshQueues:", error)
    }
  }

  return <MatchmakingQueueList queues={queues} variant={variant} />
}
