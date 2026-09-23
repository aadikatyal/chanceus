import type { CSSProperties } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { VENUES_TRENDING_THEMES } from "@/components/venues/discovery/venues-trending-themes"

export default function VenuesTrendingCarousel() {
  return (
    <section className="chance-venues-section" aria-labelledby="venues-trending-heading">
      <header className="chance-rail-card-head chance-venues-section-head">
        <div>
          <h2 id="venues-trending-heading" className="chance-section-title text-base">
            Trending events
          </h2>
          <p className="chance-text-caption">Themed nights players are hunting for</p>
        </div>
        <Link href="/bar/join" className="chance-link-arrow hidden text-sm sm:inline-flex">
          Check in →
        </Link>
      </header>

      <div className="chance-venues-trending-track" role="list">
        {VENUES_TRENDING_THEMES.map((theme) => (
          <Link
            key={theme.id}
            href="/bar/join"
            role="listitem"
            className="chance-venues-trending-card chance-focus-ring"
            style={{ "--venues-theme-accent": theme.accent } as CSSProperties}
          >
            <span className="chance-venues-trending-tag">{theme.tag}</span>
            <p className="chance-venues-trending-title">{theme.title}</p>
            <p className="chance-text-caption mt-1">{theme.subtitle}</p>
            <span className="chance-venues-trending-go mt-3 inline-flex items-center gap-1 text-xs font-semibold">
              Find a room
              <ChevronRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
