"use client"

import Link from "next/link"
import { Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { ChanceBadge } from "@/components/design-system/badge"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"

type LiveRow = {
  id: string
  gameName: string
  player1: string
  player2: string
  bet: number
}

export default function LiveMatchesRail() {
  const [rows, setRows] = useState<LiveRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const { data, error } = await supabase
          .from("matches")
          .select(
            `
            id,
            bet_amount,
            games (name),
            player1:users!matches_player1_id_fkey (display_name, username),
            player2:users!matches_player2_id_fkey (display_name, username)
          `
          )
          .eq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(6)

        if (error) {
          setRows([])
          return
        }

        setRows(
          (data ?? []).map((m: Record<string, unknown>) => {
            const games = m.games as { name?: string } | null
            const p1 = m.player1 as { display_name?: string; username?: string } | null
            const p2 = m.player2 as { display_name?: string; username?: string } | null
            const n1 = p1?.display_name || p1?.username || "Player 1"
            const n2 = p2?.display_name || p2?.username || "Player 2"
            return {
              id: m.id as string,
              gameName: games?.name ?? "Game",
              player1: n1,
              player2: n2,
              bet: (m.bet_amount as number) ?? 0,
            }
          })
        )
      } finally {
        setLoading(false)
      }
    }

    fetchLive()
    const channel = supabase
      .channel("live-matches-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchLive())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title text-base">Live matches</h2>
        <ChanceBadge variant="live" showLiveDot className="text-[0.6875rem]">
          Live
        </ChanceBadge>
      </div>

      {loading ? (
        <SkeletonRows rows={3} className="h-14" />
      ) : rows.length === 0 ? (
        <EmptyState className="py-5">
          <p className="chance-text-caption">No matches in progress. Check back in a few minutes.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="chance-rail-row chance-rail-row-bordered flex items-center gap-2 rounded-[var(--chance-radius-md)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium tracking-[-0.01em]">{row.gameName}</p>
                <p className="chance-text-caption truncate">
                  {row.player1} vs {row.player2}
                </p>
              </div>
              <span className="chance-text-mono shrink-0 text-[0.6875rem] font-medium tabular-nums text-[var(--chance-muted-fg)]">
                {row.bet} tk
              </span>
              <Link
                href={`/games/match/${row.id}`}
                className="chance-secondary-btn chance-focus-ring inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 text-xs"
              >
                <Eye className="size-3.5 stroke-[1.75]" aria-hidden />
                Watch
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
