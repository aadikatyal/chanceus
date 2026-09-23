import Link from "next/link"
import { Calendar, Coins, Trophy, Users } from "lucide-react"
import type { Tournament } from "@/lib/tournament-actions"
import { EmptyState } from "@/components/dashboard/chance-craft"
import { getGameDisplayName } from "@/lib/games/game-visuals"

type PlayTournamentsProps = {
  tournaments: Tournament[]
}

const statusLabel: Record<string, string> = {
  registration: "Open",
  brackets_generated: "Starting",
  in_progress: "Live",
  completed: "Finished",
  cancelled: "Cancelled",
}

export default function PlayTournaments({ tournaments }: PlayTournamentsProps) {
  const active = tournaments.filter((t) => ["registration", "brackets_generated", "in_progress"].includes(t.status))

  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title">Tournaments</h2>
        <Link href="/tournaments" className="chance-link-arrow chance-focus-ring rounded-sm">
          All →
        </Link>
      </div>

      {active.length === 0 ? (
        <EmptyState className="py-6">
          <p className="chance-text-caption">
            No active brackets.{" "}
            <Link href="/tournaments/create" className="font-medium text-[var(--chance-brand)] hover:underline">
              Host one
            </Link>
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {active.slice(0, 4).map((t) => (
            <li key={t.id}>
              <Link href={`/tournaments/${t.id}`} className="chance-play-tournament-row chance-focus-ring group">
                <span className="chance-play-tournament-icon">
                  <Trophy className="size-4 stroke-[1.75]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-[-0.01em]">{t.name}</p>
                  <p className="chance-text-caption truncate">
                    {t.games?.name ? getGameDisplayName(t.games.name) : "Multi-game"} · {statusLabel[t.status] ?? t.status}
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-0.5 text-[0.6875rem] text-[var(--chance-muted-fg)] sm:flex">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" aria-hidden />
                    {t.max_participants} max
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Coins className="size-3" aria-hidden />
                    {t.prize_pool} pool
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {active.length > 0 ? (
        <p className="chance-text-caption mt-3 inline-flex items-center gap-1">
          <Calendar className="size-3.5" aria-hidden />
          Brackets update live during registration.
        </p>
      ) : null}
    </div>
  )
}
