import Link from "next/link"
import { Gamepad2, UserPlus, Mic, Users, Radio, Search } from "lucide-react"

type SocialHubHeroProps = {
  friendsOnline: number
  liveMatches: number
  inQueue: number
}

export default function SocialHubHero({ friendsOnline, liveMatches, inQueue }: SocialHubHeroProps) {
  return (
    <section className="chance-social-hub-hero chance-premium-card overflow-hidden">
      <div className="chance-social-hub-hero-inner">
        <div className="min-w-0 flex-1">
          <p className="chance-hero-kicker">Community</p>
          <h1 className="chance-display-title mt-1">Social</h1>
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            A living floor — who&apos;s here, what&apos;s live, and the next match you can join.
          </p>
          <dl className="mt-4 flex flex-wrap gap-2">
            <div className="chance-play-stat-pill">
              <Users className="size-3.5 text-[var(--chance-yes)]" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{friendsOnline}</span>
              <span className="text-[var(--chance-muted-fg)]">present</span>
            </div>
            <div className="chance-play-stat-pill">
              <Radio className="size-3.5 text-[var(--chance-brand)]" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{liveMatches}</span>
              <span className="text-[var(--chance-muted-fg)]">live now</span>
            </div>
            <div className="chance-play-stat-pill">
              <Search className="size-3.5" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{inQueue}</span>
              <span className="text-[var(--chance-muted-fg)]">searching</span>
            </div>
          </dl>
        </div>
        <div className="chance-social-quick-actions">
          <Link href="/games" className="chance-hero-cta-primary chance-focus-ring inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
            Queue
          </Link>
          <Link href="/friends/add" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <UserPlus className="size-4 stroke-[1.75]" aria-hidden />
            Add
          </Link>
          <Link href="/call" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <Mic className="size-4 stroke-[1.75]" aria-hidden />
            Voice
          </Link>
        </div>
      </div>
    </section>
  )
}
