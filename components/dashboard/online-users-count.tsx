"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export default function OnlineUsersCount() {
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

        const { count, error } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", twoMinutesAgo)

        if (error) {
          console.error("Error fetching online users:", error)
          setOnlineCount(0)
        } else {
          setOnlineCount(count || 0)
        }
      } catch (error) {
        console.error("Error fetching online users:", error)
        setOnlineCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchOnlineUsers()

    const subscription = supabase
      .channel("online-users")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        () => {
          fetchOnlineUsers()
        }
      )
      .subscribe()

    const interval = setInterval(fetchOnlineUsers, 30000)

    return () => {
      supabase.removeChannel(subscription)
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <span className="inline-block h-7 w-12 animate-pulse rounded bg-[var(--chance-muted)]" aria-hidden />
    )
  }

  return onlineCount.toLocaleString()
}
