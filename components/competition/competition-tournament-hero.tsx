import { Coins, Trophy, Users } from "lucide-react"
import { ChanceBadge } from "@/components/design-system/badge"
import type { Tournament } from "@/lib/tournament-actions"

type CompetitionTournamentHeroProps = {
  tournament: Tournament & { games?: { name?: string } | null }
  participantCount: number
}

export default function CompetitionTournamentHero({ tournament, participantCount }: CompetitionTournamentHeroProps) {
  const live = tournament.status === "in_progress"
  return (
    <section className="chance-competition-hero chance-competition-tournament-hero chance-premium-card overflow-hidden">
      <div className="chance-competition-hero-inner">
        <div className="min-w-0 flex-1">
          <p className="chance-hero-kicker">Arena</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="chance-display-title">{tournament.name}</h1>
            {live ? (
              <ChanceBadge variant="live" showLiveDot>
                Live bracket
              </ChanceBadge>
            ) : (
              <span className="chance-competition-status-pill capitalize">{tournament.status.replace(/_/g, " ")}</span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--chance-muted-fg)]">
            {tournament.description || "Single-elimination bracket — prove skill under pressure."}
          </p>
          <dl className="mt-4 flex flex-wrap gap-2">
            <div className="chance-play-stat-pill">
              <Trophy className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span>{tournament.games?.name || "Game"}</span>
            </div>
            <div className="chance-play-stat-pill">
              <Users className="size-3.5" aria-hidden />
              <span className="chance-text-mono tabular-nums">{participantCount}</span>
              <span className="text-[var(--chance-muted-fg)]">/ {tournament.max_participants}</span>
            </div>
            <div className="chance-play-stat-pill">
              <Coins className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span className="chance-text-mono tabular-nums">{tournament.prize_pool.toLocaleString()}</span>
              <span className="text-[var(--chance-muted-fg)]">pool</span>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
