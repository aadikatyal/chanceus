"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, QrCode, Settings, BarChart3 } from "lucide-react"
import type { Bar } from "@/lib/bar-actions"

type VenuesHostVenueCardProps = {
  venue: Bar
  compact?: boolean
}

export default function VenuesHostVenueCard({ venue, compact }: VenuesHostVenueCardProps) {
  const router = useRouter()

  return (
    <article className={`chance-venues-host-card chance-premium-card flex flex-col ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
      <div className="mb-3">
        <p className="chance-hero-kicker text-[0.625rem]">Your venue</p>
        <h3 className="text-base font-semibold">{venue.name}</h3>
        {venue.address ? (
          <p className="chance-text-caption mt-1 flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            {venue.address}
          </p>
        ) : null}
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div className="chance-venues-meta-cell">
          <dt className="chance-text-caption">Venue code</dt>
          <dd className="chance-text-mono font-medium">{venue.venue_code}</dd>
        </div>
        <div className="chance-venues-meta-cell">
          <dt className="chance-text-caption">QR</dt>
          <dd className="chance-text-mono font-medium truncate">{venue.qr_code}</dd>
        </div>
      </dl>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => router.push(`/bars/${venue.id}`)}
          className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center justify-center gap-1.5 py-2.5 text-xs"
        >
          <QrCode className="size-3.5" aria-hidden />
          Event ops
        </button>
        <button
          type="button"
          onClick={() => router.push(`/bars/${venue.id}/dashboard`)}
          className="chance-hero-cta-primary chance-focus-ring inline-flex items-center justify-center gap-1.5 py-2.5 text-xs"
        >
          <BarChart3 className="size-3.5" aria-hidden />
          Control room
        </button>
      </div>
      <Link href={`/bars/${venue.id}/dashboard`} className="chance-link-arrow mt-3 text-center text-xs">
        Manage sessions →
      </Link>
    </article>
  )
}
