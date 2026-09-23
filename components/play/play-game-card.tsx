"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock, Trophy, Users } from "lucide-react"
import type { Game } from "@/lib/supabase/client"
import { formatQueueEstimate, type GameLiveStats } from "@/lib/games/play-catalog"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"

type PlayGameCardProps = {
  game: Game
  stats: GameLiveStats
  featured?: boolean
}

export default function PlayGameCard({ game, stats, featured }: PlayGameCardProps) {
  const displayName = getGameDisplayName(game.name)
  const thumb = getGameThumbnail(game.name)

  return (
    <article className={`chance-play-game-card ${featured ? "chance-play-game-card--featured" : ""}`}>
      <Link href={`/games/${game.id}`} className="chance-play-game-card-link chance-focus-ring group">
        <div className="chance-play-game-card-visual">
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover transition-transform duration-[var(--chance-duration-surface)] group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
          />
          <div className="chance-play-game-card-scrim" aria-hidden />
          {featured ? (
            <span className="chance-play-live-badge">Featured</span>
          ) : stats.liveMatches > 0 ? (
            <span className="chance-play-live-badge">
              <span className="chance-play-live-dot" aria-hidden />
              Live
            </span>
          ) : null}
        </div>

        <div className="chance-play-game-card-body">
          <h3 className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.02em]">{displayName}</h3>
          <p className="chance-text-caption mt-1 line-clamp-2 min-h-[2.5rem]">{game.description}</p>

          <ul className="mt-3 grid grid-cols-3 gap-2 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--chance-muted-fg)]">
            <li className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <Users className="size-3 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                Players
              </span>
              <span className="chance-text-mono text-sm font-semibold tabular-nums normal-case tracking-tight text-[var(--chance-fg)]">
                {stats.playersLive}
              </span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <Clock className="size-3 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                Queue
              </span>
              <span className="text-sm font-semibold normal-case tracking-tight text-[var(--chance-fg)]">
                {formatQueueEstimate(stats.estQueueSec)}
              </span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <Trophy className="size-3 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                Stakes
              </span>
              <span className="chance-text-mono text-sm font-semibold tabular-nums normal-case tracking-tight text-[var(--chance-fg)]">
                {game.min_bet}–{game.max_bet}
              </span>
            </li>
          </ul>
        </div>
      </Link>

      <div className="chance-play-game-card-actions">
        <Link href={`/games/${game.id}`} className="chance-hero-cta-primary chance-focus-ring flex-1 text-center text-sm">
          Queue
        </Link>
        <Link
          href={`/games/${game.id}`}
          className="chance-secondary-btn chance-focus-ring flex-1 px-3 py-2 text-sm"
        >
          Host
        </Link>
      </div>
    </article>
  )
}
