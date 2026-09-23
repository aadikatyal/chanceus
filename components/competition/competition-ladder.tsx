"use client"

import Link from "next/link"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { Crown, Flame, TrendingUp } from "lucide-react"

export type LadderEntry = {
  rank: number
  user_id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  total_wins?: number
  win_rate?: number
  current_win_streak?: number
  total_matches?: number
}

type CompetitionLadderProps = {
  entries: LadderEntry[]
  currentUserId?: string
  title?: string
  caption?: string
  limit?: number
}

function rankTier(rank: number) {
  if (rank === 1) return { label: "Champion", icon: Crown, className: "chance-competition-ladder-row--gold" }
  if (rank <= 3) return { label: "Elite", icon: TrendingUp, className: "chance-competition-ladder-row--podium" }
  if (rank <= 10) return { label: "Contender", icon: Flame, className: "" }
  return { label: "", icon: null, className: "" }
}

export default function CompetitionLadder({
  entries,
  currentUserId,
  title = "Global ladder",
  caption = "Win rate · volume · streak",
  limit = 25,
}: CompetitionLadderProps) {
  const slice = entries.slice(0, limit)

  return (
    <section className="chance-competition-ladder chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head mb-3">
        <h2 className="chance-section-title text-base">{title}</h2>
        <span className="chance-text-caption">{caption}</span>
      </div>
      {slice.length === 0 ? (
        <div className="chance-empty-state py-10 text-center">
          <p className="text-sm font-medium">Ladder warming up</p>
          <p className="chance-text-caption mt-1">Finish ranked matches to claim a spot.</p>
          <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-4 inline-flex px-4 py-2.5 text-sm">
            Enter queue
          </Link>
        </div>
      ) : (
        <ol className="chance-competition-ladder-list">
          {slice.map((entry) => {
            const name = entry.display_name || entry.username
            const isYou = currentUserId === entry.user_id
            const tier = rankTier(entry.rank)
            const TierIcon = tier.icon
            return (
              <li
                key={entry.user_id}
                className={`chance-competition-ladder-row ${tier.className} ${isYou ? "is-you" : ""}`}
              >
                <span className="chance-competition-ladder-rank chance-text-mono tabular-nums" aria-label={`Rank ${entry.rank}`}>
                  {entry.rank}
                </span>
                <ChancePlayerAvatar name={name} className="size-9 shrink-0 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    {isYou ? <span className="chance-competition-you-pill">You</span> : null}
                    {tier.label && TierIcon ? (
                      <span className="chance-competition-tier-pill inline-flex items-center gap-1">
                        <TierIcon className="size-3 stroke-[1.75]" aria-hidden />
                        {tier.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="chance-text-caption mt-0.5">
                    {Number(entry.win_rate ?? 0).toFixed(1)}% WR · {entry.total_wins ?? 0} wins
                    {(entry.current_win_streak ?? 0) > 0 ? ` · ${entry.current_win_streak} streak` : ""}
                  </p>
                </div>
                <Link
                  href={`/chat/dm/${entry.user_id}`}
                  className="chance-social-mini-action hidden sm:inline-flex"
                >
                  Challenge
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
