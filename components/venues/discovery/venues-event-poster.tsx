import Link from "next/link"
import { Clock, MapPin, Radio, Ticket, Users, Zap } from "lucide-react"
import type { VenuePoster } from "@/components/venues/discovery/venues-discovery-types"

type VenuesEventPosterProps = {
  poster: VenuePoster
  featured?: boolean
}

function joinHref(bar: VenuePoster["bar"]) {
  const code = bar.venue_code || bar.qr_code
  return `/bar/join?code=${encodeURIComponent(code)}`
}

export default function VenuesEventPoster({ poster, featured }: VenuesEventPosterProps) {
  const { bar, liveSessions, nextLabel, playerCount, prizeLabel, themeTags, featuredGame } = poster
  const location = [bar.city, bar.state].filter(Boolean).join(", ") || "Near you"
  const live = liveSessions > 0

  return (
    <article className={`chance-venues-poster ${featured ? "chance-venues-poster--featured" : ""}`}>
      <div className="chance-venues-poster-art">
        <div className="chance-venues-poster-scrim" aria-hidden />
        <div className="chance-venues-poster-badges">
          {live ? (
            <span className="chance-venues-live-pill">
              <Radio className="size-3" aria-hidden />
              Live
            </span>
          ) : (
            <span className="chance-venues-soon-pill">Opens {nextLabel}</span>
          )}
          {themeTags.slice(0, 2).map((tag) => (
            <span key={tag} className="chance-venues-soon-pill">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="chance-venues-poster-body">
        <h3 className="chance-venues-poster-title">{bar.name}</h3>
        <p className="chance-text-caption mt-1 line-clamp-2">{bar.description || featuredGame || "Competitive trivia · local leaderboard"}</p>

        <dl className="chance-venues-poster-meta mt-3">
          <div className="chance-venues-meta-cell">
            <MapPin className="size-3.5 shrink-0 text-[var(--chance-brand)]" aria-hidden />
            <span>{location}</span>
          </div>
          <div className="chance-venues-meta-cell">
            <Clock className="size-3.5 shrink-0 text-[var(--chance-brand)]" aria-hidden />
            <span>{nextLabel}</span>
          </div>
          <div className="chance-venues-meta-cell">
            <Users className="size-3.5 shrink-0 text-[var(--chance-brand)]" aria-hidden />
            <span>{playerCount} checked in</span>
          </div>
          <div className="chance-venues-meta-cell">
            <Zap className="size-3.5 shrink-0 text-[var(--chance-brand)]" aria-hidden />
            <span>{prizeLabel}</span>
          </div>
          <div className="chance-venues-meta-cell">
            <Ticket className="size-3.5 shrink-0 text-[var(--chance-brand)]" aria-hidden />
            <span>{live ? `${liveSessions} room${liveSessions === 1 ? "" : "s"} open` : "Seats available"}</span>
          </div>
        </dl>

        <Link href={joinHref(bar)} className="chance-hero-cta-primary chance-focus-ring chance-venues-poster-cta mt-4 inline-flex w-full justify-center py-2.5 text-sm">
          {live ? "Join tonight" : "View venue"}
        </Link>
      </div>
    </article>
  )
}
