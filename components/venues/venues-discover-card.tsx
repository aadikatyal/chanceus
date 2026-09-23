import Link from "next/link"
import { MapPin, Radio, ArrowRight } from "lucide-react"
import type { Bar } from "@/lib/bar-actions"

type VenuesDiscoverCardProps = {
  venue: Bar
  liveSessions?: number
}

export default function VenuesDiscoverCard({ venue, liveSessions = 0 }: VenuesDiscoverCardProps) {
  const location = [venue.city, venue.state].filter(Boolean).join(", ") || venue.address
  const isLive = liveSessions > 0

  return (
    <article className="chance-venues-discover-card chance-premium-card flex flex-col p-4 sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{venue.name}</h3>
          {venue.description ? <p className="chance-text-caption line-clamp-2 mt-0.5">{venue.description}</p> : null}
        </div>
        {isLive ? (
          <span className="chance-venues-live-pill">
            <Radio className="size-3" aria-hidden />
            Live
          </span>
        ) : (
          <span className="chance-venues-soon-pill">Upcoming</span>
        )}
      </div>
      {location ? (
        <p className="chance-text-caption mb-3 flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{location}</span>
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        <span className="chance-text-caption">
          {isLive ? `${liveSessions} session${liveSessions === 1 ? "" : "s"} tonight` : "Check schedule at door"}
        </span>
        <Link
          href={`/bar/join?code=${encodeURIComponent(venue.venue_code || venue.qr_code || "")}`}
          className="chance-hero-cta-primary chance-focus-ring inline-flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          Join event
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
