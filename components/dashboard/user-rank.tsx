"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export default function UserRank() {
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRank = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("tokens")
          .eq("id", user.id)
          .single()

        if (userError || !userData) {
          console.error("Error fetching user data:", userError)
          setLoading(false)
          return
        }

        const { count, error: rankError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gt("tokens", userData.tokens || 0)

        if (rankError) {
          console.error("Error fetching rank:", rankError)
          setRank(null)
        } else {
          setRank((count || 0) + 1)
        }
      } catch (error) {
        console.error("Error fetching user rank:", error)
        setRank(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRank()
    const interval = setInterval(fetchUserRank, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <span
        className="inline-block h-[0.875rem] w-[2.25rem] align-middle animate-pulse rounded-sm bg-[var(--chance-muted)]"
        aria-hidden
      />
    )
  }

  if (rank === null) {
    return "—"
  }

  return `#${rank.toLocaleString()}`
}
