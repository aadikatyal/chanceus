import Link from "next/link"
import { Crown, Medal } from "lucide-react"
import type { VenueChampionRow } from "@/components/venues/discovery/venues-discovery-types"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"

type VenuesCommunityProps = {
  champions: VenueChampionRow[]
}

export default function VenuesCommunity({ champions }: VenuesCommunityProps) {
  return (
    <section className="chance-venues-section" aria-labelledby="venues-community-heading">
      <header className="chance-rail-card-head chance-venues-section-head">
        <h2 id="venues-community-heading" className="chance-section-title text-base">
          Community
        </h2>
        <Link href="/leaderboards" className="chance-link-arrow text-sm">
          Rankings →
        </Link>
      </header>

      <div className="chance-venues-community-grid">
        <div className="chance-premium-card">
          <div className="chance-venues-inset">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-[var(--chance-brand)]" aria-hidden />
            <h3 className="text-sm font-semibold">Recent champions</h3>
          </div>
          {champions.length === 0 ? (
            <p className="chance-text-caption mt-4">First crown is up for grabs tonight.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {champions.map((row, i) => (
                <li key={row.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--chance-border)] p-2">
                  <span className="chance-text-mono text-xs font-bold text-[var(--chance-muted-fg)]">#{i + 1}</span>
                  <ChancePlayerAvatar name={row.playerName} className="size-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{row.playerName}</p>
                    <p className="chance-text-caption truncate">
                      {row.gameName} · {row.venueName}
                    </p>
                  </div>
                  <span className="chance-text-mono text-xs font-semibold tabular-nums">{row.score}</span>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>

        <div className="chance-premium-card">
          <div className="chance-venues-inset">
          <div className="flex items-center gap-2">
            <Medal className="size-4 text-[var(--chance-brand)]" aria-hidden />
            <h3 className="text-sm font-semibold">Why players show up</h3>
          </div>
          <ul className="chance-text-caption mt-3 space-y-2">
            <li className="rounded-lg border border-[var(--chance-border)] p-3">Same account as ranked online play — one identity everywhere.</li>
            <li className="rounded-lg border border-[var(--chance-border)] p-3">Live boards projected in-room; friends can watch the run.</li>
            <li className="rounded-lg border border-[var(--chance-border)] p-3">Venue rewards for top finishers when hosts enable them.</li>
          </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
