"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function UserRank() {
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRank = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Get user's token count
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('tokens')
          .eq('id', user.id)
          .single()

        if (userError || !userData) {
          console.error('Error fetching user data:', userError)
          setLoading(false)
          return
        }

        // Count how many users have more tokens than this user
        const { count, error: rankError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gt('tokens', userData.tokens || 0)

        if (rankError) {
          console.error('Error fetching rank:', rankError)
          setRank(null)
        } else {
          // Rank is count + 1 (if 0 users have more, rank is 1)
          setRank((count || 0) + 1)
        }
      } catch (error) {
        console.error('Error fetching user rank:', error)
        setRank(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRank()

    // Update every 30 seconds
    const interval = setInterval(fetchUserRank, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return "Loading..."
  }

  if (rank === null) {
    return "N/A"
  }

  return `#${rank.toLocaleString()}`
}
