import Link from "next/link"
import { ArrowRight, Coins, Users } from "lucide-react"
import type { Tournament } from "@/lib/tournament-actions"

type CompetitionTournamentArenaCardProps = {
  tournament: Tournament & { games?: { name?: string } | null }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ")
}

export default function CompetitionTournamentArenaCard({ tournament }: CompetitionTournamentArenaCardProps) {
  const roundLabel =
    tournament.current_round === 0
      ? "Registration open"
      : `Round ${tournament.current_round}/${tournament.total_rounds}`

  return (
    <article className="chance-competition-arena-card chance-premium-card flex flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{tournament.name}</h3>
          <p className="chance-text-caption">{tournament.games?.name || "Arena"}</p>
        </div>
        <span className="chance-competition-status-pill capitalize">{statusLabel(tournament.status)}</span>
      </div>
      <div className="chance-competition-arena-pool mb-4">
        <p className="chance-text-caption">Prize pool</p>
        <p className="chance-text-mono text-2xl font-bold tabular-nums text-[var(--chance-brand)]">
          {tournament.prize_pool.toLocaleString()}
        </p>
        <p className="chance-text-caption mt-1">{tournament.entry_fee} tokens to enter</p>
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div className="chance-competition-arena-meta">
          <dt className="chance-text-caption flex items-center gap-1">
            <Users className="size-3.5" aria-hidden /> Field
          </dt>
          <dd className="font-medium">{tournament.max_participants} max</dd>
        </div>
        <div className="chance-competition-arena-meta">
          <dt className="chance-text-caption flex items-center gap-1">
            <Coins className="size-3.5" aria-hidden /> Stage
          </dt>
          <dd className="font-medium capitalize">{roundLabel}</dd>
        </div>
      </dl>
      <Link
        href={`/tournaments/${tournament.id}`}
        className="chance-hero-cta-ghost chance-focus-ring mt-auto inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
      >
        Enter arena
        <ArrowRight className="size-4 stroke-[1.75]" aria-hidden />
      </Link>
    </article>
  )
}
