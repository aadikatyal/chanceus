"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { ChanceBadge } from "@/components/design-system/badge"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"

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
          console.error("Error fetching winners:", error)
          setWinners([])
        } else if (matchesData) {
          const formattedWinners: Winner[] = matchesData.map((match: any) => ({
            id: match.id,
            username: match.winner?.username || "Unknown",
            display_name: match.winner?.display_name || match.winner?.username || "Unknown",
            amount: match.bet_amount * 2,
            won_at: match.completed_at,
            game_name: match.games?.name || "Unknown Game",
          }))
          setWinners(formattedWinners)
        }
      } catch (error) {
        console.error("Error fetching winners:", error)
        setWinners([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentWinners()

    const subscription = supabase
      .channel("global-winners")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: "status=eq.completed",
        },
        () => fetchRecentWinners()
      )
      .subscribe()

    const interval = setInterval(fetchRecentWinners, 30000)

    return () => {
      supabase.removeChannel(subscription)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy={loading}>
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base" id="dashboard-winners">
          Recent payouts
        </h2>
        <ChanceBadge variant="live" showLiveDot className="text-[0.6875rem]">
          Live
        </ChanceBadge>
      </div>

      {loading ? (
        <SkeletonRows rows={5} className="h-10" />
      ) : winners.length === 0 ? (
        <EmptyState className="py-5">
          <p className="chance-text-caption">No recent payouts yet.</p>
        </EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-[var(--chance-radius-md)] border border-[var(--chance-border)]">
          {winners.map((winner, index) => (
            <li
              key={winner.id}
              className={`chance-payout-row grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 px-3 py-2.5 text-sm ${
                index > 0 ? "border-t border-[var(--chance-border)]" : ""
              }`}
            >
              <span className="truncate text-[0.8125rem] font-medium tracking-[-0.01em] text-[var(--chance-fg)]">
                {winner.display_name}
              </span>
              <span className="chance-text-mono text-right text-[0.8125rem] font-semibold tabular-nums text-[var(--chance-yes)]">
                +{winner.amount}
              </span>
              <span className="col-span-2 truncate chance-text-caption">
                {winner.game_name} · {formatTimeAgo(winner.won_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatTimeAgo(dateString: string) {
  const diffInSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diffInSeconds < 0) return "now"
  if (diffInSeconds < 60) return `${diffInSeconds}s`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  return `${Math.floor(diffInSeconds / 86400)}d`
}
