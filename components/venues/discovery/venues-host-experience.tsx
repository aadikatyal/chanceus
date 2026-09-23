import Link from "next/link"
import { BarChart3, Calendar, QrCode, Repeat, Trophy } from "lucide-react"
import type { Bar } from "@/lib/bar-actions"
import VenuesHostVenueCard from "@/components/venues/venues-host-venue-card"

type VenuesHostExperienceProps = {
  hostVenues: Bar[]
}

const BENEFITS = [
  { icon: Repeat, title: "Recurring events", body: "Weekly trivia that fills the room." },
  { icon: BarChart3, title: "Automatic scoring", body: "Leaderboards update live — no spreadsheets." },
  { icon: QrCode, title: "QR check-in", body: "Players in the door in seconds." },
  { icon: Calendar, title: "Session control", body: "Start, pause, and crown winners from one room." },
  { icon: Trophy, title: "Local rankings", body: "Tie online identity to in-venue glory." },
]

export default function VenuesHostExperience({ hostVenues }: VenuesHostExperienceProps) {
  return (
    <section className="chance-venues-section chance-venues-host-block" aria-labelledby="venues-host-heading">
      <div className="chance-venues-host-panel chance-premium-card overflow-hidden">
        <div className="chance-venues-host-panel-inner chance-venues-inset">
          <div className="min-w-0 flex-1">
            <p className="chance-hero-kicker">For operators</p>
            <h2 id="venues-host-heading" className="chance-display-title mt-1">
              Host the experience
            </h2>
            <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--chance-muted-fg)]">
              Run competitive nights that feel like a flagship event — not bar trivia admin. QR check-in, live boards,
              and repeat crowds built in.
            </p>

            <ul className="chance-venues-host-benefits mt-5">
              {BENEFITS.map((b) => {
                const Icon = b.icon
                return (
                  <li key={b.title} className="chance-venues-host-benefit">
                    <span className="chance-venues-timeline-icon">
                      <Icon className="size-4 stroke-[1.75]" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{b.title}</p>
                      <p className="chance-text-caption">{b.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <Link href="/bars/create" className="chance-hero-cta-primary chance-focus-ring mt-6 inline-flex px-5 py-2.5 text-sm">
              Become a host
            </Link>
          </div>
        </div>

        {hostVenues.length > 0 ? (
          <div className="chance-venues-inset border-t border-[var(--chance-border)]">
            <p className="chance-text-caption mb-3 font-semibold uppercase tracking-wide">Your venues</p>
            <div className="chance-venues-host-venues-grid">
              {hostVenues.map((venue) => (
                <VenuesHostVenueCard key={venue.id} venue={venue} compact />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
