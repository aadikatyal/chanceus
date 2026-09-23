"use client"

import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { Trophy, Eye, Clock } from "lucide-react"
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

interface CompetitionMatchTimelineProps {
  matches: MatchHistoryItem[]
  currentUserId: string
  title?: string
}

function relativeWhen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return "now"
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function CompetitionMatchTimeline({
  matches,
  currentUserId,
  title = "Competitive history",
}: CompetitionMatchTimelineProps) {
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

  const getTokenChange = (match: MatchHistoryItem, result: string) => {
    if (!match || typeof match.bet_amount !== "number") return "0"
    if (result === "won") return `+${match.bet_amount * 2}`
    if (result === "lost") return `-${match.bet_amount}`
    if (result === "draw") return `+${match.bet_amount}`
    return "0"
  }

  return (
    <section className="chance-competition-timeline chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head mb-4">
        <h2 className="chance-section-title text-base">{title}</h2>
        <span className="chance-text-caption">Your path — newest first</span>
      </div>

      {matches.length === 0 ? (
        <div className="chance-empty-state py-10 text-center">
          <Trophy className="mx-auto mb-3 size-10 stroke-[1.5] text-[var(--chance-muted-fg)] opacity-60" aria-hidden />
          <p className="text-sm font-medium">No battles logged yet</p>
          <p className="chance-text-caption mt-1">Your timeline starts with the next queue.</p>
          <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-4 inline-flex px-4 py-2.5 text-sm">
            Find a match
          </Link>
        </div>
      ) : (
        <ol className="chance-competition-timeline-track">
          {matches.map((match) => {
            if (!match?.player1) return null
            const result = getMatchResult(match)
            const opponent = getOpponent(match)
            const tokenChange = getTokenChange(match, result)
            const when = match.completed_at || match.created_at

            return (
              <li key={match.id} className={`chance-competition-timeline-node chance-competition-timeline-node--${result}`}>
                <div className="chance-competition-timeline-rail" aria-hidden />
                <div className="chance-competition-timeline-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{match.games.name}</span>
                        <span className={`chance-competition-result-pill chance-competition-result-pill--${result}`}>
                          {result === "won" ? "Victory" : result === "lost" ? "Defeat" : result === "draw" ? "Draw" : "Live"}
                        </span>
                      </div>
                      {opponent ? (
                        <div className="mt-2 flex items-center gap-2">
                          <ChancePlayerAvatar name={opponent.display_name || opponent.username} className="size-8 text-[10px]" />
                          <div>
                            <p className="text-xs font-medium">vs {opponent.display_name || opponent.username}</p>
                            <p className="chance-text-caption flex items-center gap-1">
                              <Clock className="size-3" aria-hidden />
                              {relativeWhen(when)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={`chance-text-mono text-lg font-semibold tabular-nums ${
                          result === "won"
                            ? "text-[var(--chance-yes)]"
                            : result === "lost"
                              ? "text-[var(--chance-no)]"
                              : "text-[var(--chance-fg)]"
                        }`}
                      >
                        {tokenChange}
                      </p>
                      <p className="chance-text-caption">{match.bet_amount} staked</p>
                    </div>
                  </div>
                  {result === "ongoing" ? (
                    <Link
                      href={`/games/match/${match.id}`}
                      className="chance-secondary-btn chance-focus-ring mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <Eye className="size-3.5" aria-hidden />
                      Enter match
                    </Link>
                  ) : (
                    <Link href={`/games/match/${match.id}`} className="chance-link-arrow mt-3 inline-block text-xs">
                      Match recap →
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
