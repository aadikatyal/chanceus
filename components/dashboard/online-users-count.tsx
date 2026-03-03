"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function OnlineUsersCount() {
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        // Count users who have been active in the last 2 minutes
        // This is more reliable than is_online which can get stale
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
        
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', twoMinutesAgo)

        if (error) {
          console.error('Error fetching online users:', error)
          setOnlineCount(0)
        } else {
          setOnlineCount(count || 0)
        }
      } catch (error) {
        console.error('Error fetching online users:', error)
        setOnlineCount(0)
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately
    fetchOnlineUsers()

    // Set up realtime subscription for last_seen updates
    const subscription = supabase
      .channel('online-users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        () => {
          // Refetch when any user's last_seen is updated
          fetchOnlineUsers()
        }
      )
      .subscribe()

    // Update every 30 seconds as backup (realtime handles immediate updates)
    const interval = setInterval(fetchOnlineUsers, 30000)

    return () => {
      supabase.removeChannel(subscription)
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return "Loading..."
  }

  return onlineCount.toLocaleString()
}
