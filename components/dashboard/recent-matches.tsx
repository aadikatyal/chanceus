"use client"

import { Calculator, Grid3X3, Brain, Zap, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, type KeyboardEvent } from "react"
import { supabase } from "@/lib/supabase/client"
import { ChanceBadge } from "@/components/design-system/badge"
import { EmptyState, resultLabel, SkeletonRows } from "@/components/dashboard/chance-craft"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"

function iconForGame(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (n.includes("math")) return Calculator
  if (n.includes("row") || n.includes("four")) return Grid3X3
  if (n.includes("trivia")) return Brain
  return Zap
}

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
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentMatches = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

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
            const isPlayer1 = match.player1_id === user.id
            const isPlayer2 = match.player2_id === user.id
            const opponent = isPlayer1 ? match.player2 : isPlayer2 ? match.player1 : null
            const opponentName = opponent?.display_name || opponent?.username || "Unknown"
            const gameName = match.games?.name || "Unknown Game"

            let result: "won" | "lost" | "draw" = "draw"
            let tokens = 0

            if (match.winner_id === user.id) {
              result = "won"
              tokens = match.bet_amount * 2
            } else if (match.winner_id && match.winner_id !== user.id) {
              result = "lost"
              tokens = -match.bet_amount
            }

            let duration = "—"
            if (match.started_at && match.completed_at) {
              const start = new Date(match.started_at)
              const end = new Date(match.completed_at)
              const diffMs = end.getTime() - start.getTime()
              const diffMins = Math.floor(diffMs / 60000)
              const diffSecs = Math.floor((diffMs % 60000) / 1000)
              duration = `${diffMins}:${String(diffSecs).padStart(2, "0")}`
            }

            const completedAt = new Date(match.completed_at)
            const now = new Date()
            const diffMs = now.getTime() - completedAt.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            let timestamp = "now"
            if (diffDays > 0) timestamp = `${diffDays}d`
            else if (diffHours > 0) timestamp = `${diffHours}h`
            else if (diffMins > 0) timestamp = `${diffMins}m`

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

    const subscription = supabase
      .channel("user-matches")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: "status=eq.completed",
        },
        () => fetchRecentMatches()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const openMatch = useCallback(
    (id: string) => {
      router.push(`/games/match/${id}`)
    },
    [router]
  )

  const onRowKeyDown = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      openMatch(id)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy={loading}>
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title" id="dashboard-recent-matches">
          Recent matches
        </h2>
        <Link href="/matches" className="chance-link-arrow chance-focus-ring rounded-sm">
          View all →
        </Link>
      </div>

      {loading ? (
        <SkeletonRows rows={4} className="h-12" />
      ) : matches.length === 0 ? (
        <EmptyState>
          <p className="chance-text-caption">
            No completed matches yet.{" "}
            <Link href="/games" className="font-medium text-[var(--chance-brand)] hover:underline">
              Find a match
            </Link>
          </p>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto -mx-0.5 px-0.5 pb-0.5 [scrollbar-width:thin]">
          <table className="chance-table-rich w-full min-w-[520px] border-collapse text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--chance-border)] text-left">
                <th scope="col" className="pb-3 pr-3 font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Game
                </th>
                <th scope="col" className="pb-3 pr-3 font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Opponent
                </th>
                <th scope="col" className="pb-3 pr-3 font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Result
                </th>
                <th scope="col" className="pb-3 pr-3 text-right font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  P/L
                </th>
                <th scope="col" className="pb-3 text-right font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const Icon = iconForGame(match.game)
                return (
                  <tr
                    key={match.id}
                    className="chance-table-row border-b border-[var(--chance-border)] last:border-0"
                    tabIndex={0}
                    role="link"
                    aria-label={`${match.game} vs ${match.opponent}, ${resultLabel(match.result)}`}
                    onClick={() => openMatch(match.id)}
                    onKeyDown={(e) => onRowKeyDown(e, match.id)}
                  >
                    <td className="py-3.5 pr-3">
                      <span className="inline-flex items-center gap-2.5 font-medium tracking-[-0.01em] text-[var(--chance-fg)]">
                        <span className="chance-table-game-icon inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--chance-radius-sm)] bg-[var(--chance-muted)] text-[var(--chance-brand)]">
                          <Icon className="size-4 stroke-[1.75]" aria-hidden />
                        </span>
                        {match.game}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className="inline-flex items-center gap-2.5 text-[var(--chance-muted-fg)]">
                        <ChancePlayerAvatar
                          name={match.opponent}
                          className="chance-table-opponent-avatar size-7 text-[0.6875rem]"
                        />
                        <span className="truncate max-w-[8rem] sm:max-w-none">{match.opponent}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-3">
                      <ChanceBadge
                        variant={
                          match.result === "won" ? "yes" : match.result === "lost" ? "no" : "secondary"
                        }
                        className="chance-badge-capitalize text-[0.6875rem]"
                      >
                        {resultLabel(match.result)}
                      </ChanceBadge>
                    </td>
                    <td
                      className={`py-3.5 pr-3 text-right chance-text-mono text-[0.8125rem] font-semibold tabular-nums tracking-tight ${
                        match.tokens > 0
                          ? "text-[var(--chance-yes)]"
                          : match.tokens < 0
                            ? "text-[var(--chance-no)]"
                            : "text-[var(--chance-muted-fg)]"
                      }`}
                    >
                      {match.tokens > 0 ? "+" : ""}
                      {match.tokens}
                    </td>
                    <td className="py-3.5 text-right chance-text-mono text-[0.75rem] tabular-nums text-[var(--chance-muted-fg)] whitespace-nowrap">
                      <span className="text-[var(--chance-fg)]">{match.duration}</span>
                      <span aria-hidden> · </span>
                      {match.timestamp}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
