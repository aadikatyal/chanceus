"use client"

import { Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { DashboardGame } from "@/components/dashboard/quick-actions"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"

type FeaturedGamesProps = {
  games: DashboardGame[]
}

export default function FeaturedGames({ games }: FeaturedGamesProps) {
  const [waitingByGame, setWaitingByGame] = useState<Record<string, number>>({})

  useEffect(() => {
    if (games.length === 0) return

    const load = async () => {
      const ids = games.map((g) => g.id)
      const { data } = await supabase
        .from("matches")
        .select("game_id")
        .eq("status", "waiting")
        .in("game_id", ids)

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const gid = row.game_id as string
        counts[gid] = (counts[gid] ?? 0) + 1
      }
      setWaitingByGame(counts)
    }

    load()
    const channel = supabase
      .channel("featured-waiting")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: "status=eq.waiting" },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [games])

  return (
    <section aria-labelledby="featured-games-heading">
      <div className="chance-section-head">
        <h2 id="featured-games-heading" className="chance-section-title">
          Featured games
        </h2>
        <Link href="/games" className="chance-link-arrow chance-focus-ring rounded-sm">
          View all →
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="chance-empty-state py-10">
          <p className="chance-text-caption">
            No active games in the lobby.{" "}
            <Link href="/games" className="font-medium text-[var(--chance-brand)] hover:underline">
              Check back soon
            </Link>
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-5">
          {games.slice(0, 5).map((game, index) => {
            const displayName = getGameDisplayName(game.name)
            const thumbnailSrc = getGameThumbnail(game.name)
            const waiting = waitingByGame[game.id] ?? 0
            return (
              <li key={game.id}>
                <Link
                  href={`/games?game=${encodeURIComponent(game.id)}`}
                  className="chance-game-tile chance-focus-ring group"
                >
                  <div
                    className={`chance-game-tile-visual chance-game-tile-visual--photo chance-game-tile-visual--${index % 5}`}
                  >
                    <Image
                      src={thumbnailSrc}
                      alt={displayName}
                      fill
                      className="object-cover transition-transform duration-[var(--chance-duration-surface)] group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 45vw, (max-width: 1280px) 20vw, 180px"
                    />
                    <div className="chance-game-tile-visual-scrim" aria-hidden />
                    <div className="chance-game-tile-glow" aria-hidden />
                  </div>
                  <div className="chance-game-tile-foot">
                    <span className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug tracking-[-0.01em] text-[var(--chance-fg)]">
                      {displayName}
                    </span>
                    <div className="chance-game-tile-foot-meta mt-1.5">
                      <span className="flex items-center gap-1.5 chance-text-caption">
                        <Users className="size-3.5 shrink-0 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                        {waiting > 0 ? (
                          <>
                            <span className="chance-text-mono font-medium text-[var(--chance-yes)]">{waiting}</span>
                            in queue
                          </>
                        ) : (
                          <>Open lobby</>
                        )}
                      </span>
                      <span className="chance-text-caption chance-text-mono text-[var(--chance-muted-fg)]">
                        {game.min_bet}–{game.max_bet} tk
                      </span>
                      <span className="chance-game-tile-play">Play now</span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
