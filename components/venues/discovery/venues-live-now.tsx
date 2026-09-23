import Link from "next/link"
import { Eye, Radio } from "lucide-react"
import type { VenueLiveEvent } from "@/components/venues/discovery/venues-discovery-types"

type VenuesLiveNowProps = {
  events: VenueLiveEvent[]
}

function sessionJoinHref(event: VenueLiveEvent) {
  return `/bar/join?session=${encodeURIComponent(event.session.session_code)}`
}

export default function VenuesLiveNow({ events }: VenuesLiveNowProps) {
  if (events.length === 0) {
    return (
      <section className="chance-venues-section" aria-labelledby="venues-live-now-heading">
        <h2 id="venues-live-now-heading" className="chance-section-title text-base">
          Live right now
        </h2>
        <div className="chance-premium-card mt-3 px-5 py-8 text-center">
          <p className="text-sm font-medium">No tables running — yet.</p>
          <p className="chance-text-caption mt-1">Scan in at the door or pick a venue below to start the night.</p>
          <Link href="#venues-live-tonight" className="chance-hero-cta-ghost chance-focus-ring mt-4 inline-flex px-4 py-2 text-sm">
            Browse tonight
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="chance-venues-section" aria-labelledby="venues-live-now-heading">
      <header className="chance-rail-card-head chance-venues-section-head">
        <h2 id="venues-live-now-heading" className="chance-section-title text-base">
          Live right now
        </h2>
        <span className="chance-venues-live-pill">
          <Radio className="size-3.5" aria-hidden />
          Real-time
        </span>
      </header>

      <ul className="chance-venues-live-now-list">
        {events.map((event) => {
          const active = event.session.status === "active"
          return (
            <li key={event.session.id}>
              <div className="chance-venues-live-now-row">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{event.bar.name}</p>
                  <p className="chance-text-caption truncate">
                    {event.gameName} · {event.playerCount} playing · {event.prizeLabel}
                  </p>
                  <p className="chance-text-caption mt-0.5 capitalize">{event.session.status.replace("_", " ")}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <Link
                    href={sessionJoinHref(event)}
                    className="chance-hero-cta-primary chance-focus-ring px-3 py-2 text-xs"
                  >
                    {active ? "Play" : "Join lobby"}
                  </Link>
                  {active ? (
                    <Link
                      href={sessionJoinHref(event)}
                      className="chance-secondary-btn chance-focus-ring inline-flex items-center justify-center gap-1 px-3 py-2 text-xs"
                    >
                      <Eye className="size-3.5" aria-hidden />
                      Watch
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
