import Link from "next/link"
import { Radio } from "lucide-react"
import VenuesEventPoster from "@/components/venues/discovery/venues-event-poster"
import type { VenuePoster } from "@/components/venues/discovery/venues-discovery-types"

type VenuesLiveTonightProps = {
  posters: VenuePoster[]
  liveSessionTotal: number
}

export default function VenuesLiveTonight({ posters, liveSessionTotal }: VenuesLiveTonightProps) {
  return (
    <section id="venues-live-tonight" className="chance-venues-section scroll-mt-6" aria-labelledby="venues-tonight-heading">
      <header className="chance-rail-card-head chance-venues-section-head">
        <div>
          <h2 id="venues-tonight-heading" className="chance-section-title text-base">
            Live tonight
          </h2>
          <p className="chance-text-caption">Event posters — pick a room and check in</p>
        </div>
        {liveSessionTotal > 0 ? (
          <span className="chance-venues-live-pill">
            <Radio className="size-3.5" aria-hidden />
            {liveSessionTotal} live
          </span>
        ) : null}
      </header>

      {posters.length === 0 ? (
        <div className="chance-premium-card text-center">
          <div className="chance-venues-inset py-8">
          <p className="text-sm font-medium">Venues are warming up</p>
          <p className="chance-text-caption mt-1">Have a code from the host? Jump straight in.</p>
          <Link href="/bar/join" className="chance-hero-cta-primary chance-focus-ring mt-4 inline-flex px-4 py-2.5 text-sm">
            Enter check-in
          </Link>
          </div>
        </div>
      ) : (
        <div className="chance-venues-poster-grid">
          {posters.map((poster, index) => (
            <VenuesEventPoster key={poster.bar.id} poster={poster} featured={index === 0 && poster.liveSessions > 0} />
          ))}
        </div>
      )}
    </section>
  )
}
