import Link from "next/link"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { ArrowUpRight, Trophy } from "lucide-react"

type CompetitionRankSpotlightProps = {
  displayName: string
  rank: number | null
  winRate: number
  totalWins: number
  streak: number
  ladderSize?: number
}

export default function CompetitionRankSpotlight({
  displayName,
  rank,
  winRate,
  totalWins,
  streak,
  ladderSize,
}: CompetitionRankSpotlightProps) {
  return (
    <section className="chance-competition-rank-spotlight chance-premium-card p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ChancePlayerAvatar name={displayName} className="size-16 text-lg sm:size-20 sm:text-xl" />
          <div>
            <p className="chance-hero-kicker">Your standing</p>
            <p className="chance-text-mono text-3xl font-bold tabular-nums sm:text-4xl">
              {rank ? `#${rank}` : "Unranked"}
            </p>
            <p className="chance-text-caption mt-1">
              {ladderSize ? `Among ${ladderSize} rated players` : "Climb by winning ranked matches"}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Win rate", value: `${winRate}%` },
            { label: "Career wins", value: totalWins },
            { label: "Streak", value: streak },
          ].map((s) => (
            <div key={s.label} className="chance-competition-rank-stat">
              <dt className="chance-text-caption">{s.label}</dt>
              <dd className="chance-text-mono text-lg font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--chance-border)] pt-4">
        <Link href="/leaderboards" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2 px-3 py-2 text-xs">
          <Trophy className="size-3.5" aria-hidden />
          View ladder
        </Link>
        <Link href="/games" className="chance-hero-cta-primary chance-focus-ring inline-flex items-center gap-2 px-3 py-2 text-xs">
          <ArrowUpRight className="size-3.5" aria-hidden />
          Rank up now
        </Link>
      </div>
    </section>
  )
}
