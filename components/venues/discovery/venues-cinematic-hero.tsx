import Link from "next/link"
import { MapPin, Plus, Radio, Sparkles, Trophy, Users } from "lucide-react"

type VenuesCinematicHeroProps = {
  liveEvents: number
  venuesListed: number
  playersInRoom: number
}

export default function VenuesCinematicHero({ liveEvents, venuesListed, playersInRoom }: VenuesCinematicHeroProps) {
  return (
    <section className="chance-venues-cinematic chance-hero-cinematic" aria-labelledby="venues-hero-heading">
      <div className="chance-venues-cinematic-glow" aria-hidden />

      <div className="chance-streak-float chance-venues-hero-float">
        <div className="chance-streak-icon-wrap">
          <Radio className="size-5 stroke-[1.75]" aria-hidden />
        </div>
        <div className="chance-streak-float-copy min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {liveEvents > 0 ? `${liveEvents} live tonight` : "Doors opening soon"}
          </p>
          <p className="chance-streak-float-meta chance-text-caption mt-0.5">
            {playersInRoom > 0 ? `${playersInRoom} checked in` : "Be first on the board"}
          </p>
        </div>
      </div>

      <div className="chance-hero-content chance-venues-hero-content">
        <div className="chance-hero-main max-w-2xl">
          <p className="chance-hero-kicker">
            <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
            Live competitive nights
          </p>
          <h1 id="venues-hero-heading" className="chance-hero-title">
            Online skill.
            <br />
            Real rooms. Real stakes.
          </h1>
          <p className="mt-3 max-w-lg text-[0.9375rem] leading-[1.55] tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            This is where ranked play leaves the screen — trivia nights, themed battles, and local crowns happening
            around you tonight.
          </p>

          <dl className="mt-4 flex flex-wrap gap-2">
            <div className="chance-play-stat-pill">
              <MapPin className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span>
                <span className="chance-text-mono font-semibold tabular-nums">{venuesListed || "—"}</span> venues
              </span>
            </div>
            <div className="chance-play-stat-pill">
              <Users className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span>
                <span className="chance-text-mono font-semibold tabular-nums">{playersInRoom}</span> in room
              </span>
            </div>
            <div className="chance-play-stat-pill">
              <Trophy className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span>Local boards · drink rewards</span>
            </div>
          </dl>

          <div className="chance-hero-cta-row mt-5">
            <Link href="#venues-live-tonight" className="chance-hero-cta-primary chance-focus-ring chance-pressable">
              Find a venue
            </Link>
            <Link href="/bars/create" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2">
              <Plus className="size-4 stroke-[1.75]" aria-hidden />
              Host an event
            </Link>
          </div>
        </div>

        <div className="chance-venues-hero-posters" aria-hidden>
          <div className="chance-venues-hero-poster chance-venues-hero-poster--a">
            <Sparkles className="size-5 opacity-80" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide">Tonight</p>
            <p className="text-sm font-bold leading-tight">Theme night</p>
          </div>
          <div className="chance-venues-hero-poster chance-venues-hero-poster--b">
            <Trophy className="size-5 opacity-80" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide">Prize pool</p>
            <p className="text-sm font-bold leading-tight">Top 3 board</p>
          </div>
        </div>
      </div>
    </section>
  )
}
