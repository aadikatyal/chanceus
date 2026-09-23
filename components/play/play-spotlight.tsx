import Image from "next/image"
import Link from "next/link"
import { Clock, Users, Zap } from "lucide-react"
import type { Game } from "@/lib/supabase/client"
import { formatQueueEstimate, type GameLiveStats } from "@/lib/games/play-catalog"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"

type PlaySpotlightProps = {
  game: Game
  stats: GameLiveStats
}

export default function PlaySpotlight({ game, stats }: PlaySpotlightProps) {
  const displayName = getGameDisplayName(game.name)
  const thumb = getGameThumbnail(game.name)

  return (
    <section className="chance-play-spotlight" aria-labelledby="play-spotlight-heading">
      <div className="chance-play-spotlight-art">
        <Image src={thumb} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" priority />
        <div className="chance-play-spotlight-scrim" aria-hidden />
      </div>

      <div className="chance-play-spotlight-body">
        <p className="chance-hero-kicker">
          <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
          Featured · Live now
        </p>
        <h2 id="play-spotlight-heading" className="chance-play-spotlight-title">
          {displayName}
        </h2>
        <p className="mt-2 max-w-lg text-[0.9375rem] leading-[1.55] tracking-[-0.01em] text-[var(--chance-muted-fg)]">
          {game.description ?? "Ranked head-to-head. Queue up and get paired in seconds."}
        </p>

        <dl className="mt-4 flex flex-wrap gap-3">
          <div className="chance-play-stat-pill">
            <Users className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            <span>
              <span className="chance-text-mono font-semibold tabular-nums">{stats.playersLive}</span> playing
            </span>
          </div>
          <div className="chance-play-stat-pill">
            <Zap className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            <span>
              <span className="chance-text-mono font-semibold tabular-nums">{stats.inQueue}</span> in queue
            </span>
          </div>
          <div className="chance-play-stat-pill">
            <Clock className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
            <span>Est. {formatQueueEstimate(stats.estQueueSec)}</span>
          </div>
        </dl>

        <div className="chance-hero-cta-row mt-5">
          <Link href={`/games/${game.id}`} className="chance-hero-cta-primary chance-focus-ring">
            Find match
          </Link>
          <Link href={`/games/${game.id}`} className="chance-hero-cta-ghost chance-focus-ring">
            Custom lobby
          </Link>
        </div>
      </div>
    </section>
  )
}
