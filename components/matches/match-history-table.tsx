"use client"

import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { Clock, Trophy, Eye } from "lucide-react"
import Link from "next/link"

interface MatchHistoryItem {
  id: string
  bet_amount: number
  status: string
  winner_id?: string
  started_at?: string
  completed_at?: string
  created_at: string
  games: {
    name: string
  }
  player1: {
    id: string
    username: string
    display_name?: string
    avatar_url?: string
  }
  player2?: {
    id: string
    username: string
    display_name?: string
    avatar_url?: string
  }
}

interface MatchHistoryTableProps {
  matches: MatchHistoryItem[]
  currentUserId: string
}

export default function MatchHistoryTable({ matches, currentUserId }: MatchHistoryTableProps) {
  const getMatchResult = (match: MatchHistoryItem) => {
    if (!match?.status) return "ongoing"
    if (match.status !== "completed") return "ongoing"
    if (!match.winner_id) return "draw"
    return match.winner_id === currentUserId ? "won" : "lost"
  }

  const getOpponent = (match: MatchHistoryItem) => {
    if (!match.player1) return match.player2 || null
    if (!match.player2) return match.player1
    return match.player1.id === currentUserId ? match.player2 : match.player1
  }

  const resultLabel = (result: string) => {
    switch (result) {
      case "won":
        return { text: "Won", className: "text-[var(--chance-yes)]" }
      case "lost":
        return { text: "Lost", className: "text-[var(--chance-no)]" }
      case "draw":
        return { text: "Draw", className: "text-[var(--chance-muted-fg)]" }
      default:
        return { text: "Live", className: "text-[var(--chance-brand)]" }
    }
  }

  const getTokenChange = (match: MatchHistoryItem, result: string) => {
    if (!match || typeof match.bet_amount !== "number") return "0"
    if (result === "won") return `+${match.bet_amount * 2}`
    if (result === "lost") return `-${match.bet_amount}`
    if (result === "draw") return `+${match.bet_amount}`
    return "0"
  }

  return (
    <section className="chance-premium-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="chance-section-title">Match history</h2>
          <p className="chance-text-caption">Your complete gaming record</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="py-10 text-center">
          <Trophy className="mx-auto mb-3 size-10 stroke-[1.5] text-[var(--chance-muted-fg)] opacity-60" aria-hidden />
          <p className="text-sm font-medium text-[var(--chance-fg)]">No matches yet</p>
          <p className="chance-text-caption mt-1">Queue a game to start building history.</p>
          <Link
            href="/games"
            className="chance-hero-cta-primary chance-focus-ring mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            Find a match
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {matches
            .map((match) => {
              if (!match?.player1) return null

              const result = getMatchResult(match)
              const opponent = getOpponent(match)
              const tokenChange = getTokenChange(match, result)
              const badge = resultLabel(result)

              return (
                <li
                  key={match.id}
                  className="flex flex-col gap-3 rounded-lg border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--chance-fg)]">{match.games.name}</span>
                      <span className={`chance-text-caption font-medium ${badge.className}`}>{badge.text}</span>
                    </div>
                    <div className="chance-text-caption mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {opponent ? (
                        <span className="inline-flex items-center gap-2">
                          <ChancePlayerAvatar
                            name={opponent.display_name || opponent.username}
                            className="size-5 text-[10px]"
                          />
                          vs @{opponent.username}
                        </span>
                      ) : (
                        <span>vs unknown</span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3 stroke-[1.75]" aria-hidden />
                        {new Date(match.completed_at || match.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <div
                        className={`chance-text-mono text-sm font-semibold tabular-nums ${
                          result === "won"
                            ? "text-[var(--chance-yes)]"
                            : result === "lost"
                              ? "text-[var(--chance-no)]"
                              : "text-[var(--chance-muted-fg)]"
                        }`}
                      >
                        {tokenChange} tokens
                      </div>
                      <div className="chance-text-caption">Entry {match.bet_amount}</div>
                    </div>
                    <Link
                      href={`/games/match/${match.id}`}
                      className="chance-hero-cta-ghost chance-focus-ring inline-flex size-9 items-center justify-center"
                      aria-label={`View match ${match.games.name}`}
                    >
                      <Eye className="size-4 stroke-[1.75]" aria-hidden />
                    </Link>
                  </div>
                </li>
              )
            })
            .filter(Boolean)}
        </ul>
      )}
    </section>
  )
}
