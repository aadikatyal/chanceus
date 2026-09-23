"use client"

import { useMemo, useState } from "react"
import type { Game } from "@/lib/supabase/client"
import {
  filterPlayGames,
  type GameLiveStats,
  type PlayCategoryId,
} from "@/lib/games/play-catalog"
import PlayToolbar from "@/components/play/play-toolbar"
import PlaySpotlight from "@/components/play/play-spotlight"
import PlayGameCard from "@/components/play/play-game-card"
import { EmptyState } from "@/components/dashboard/chance-craft"
import Link from "next/link"

type PlayPageClientProps = {
  games: Game[]
  statsByGame: Record<string, GameLiveStats>
  featuredGameId: string | null
  totalLive: number
  totalInQueue: number
}

export default function PlayPageClient({
  games,
  statsByGame,
  featuredGameId,
  totalLive,
  totalInQueue,
}: PlayPageClientProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<PlayCategoryId>("all")

  const filtered = useMemo(
    () => filterPlayGames(games, query, category),
    [games, query, category]
  )

  const featuredGame = featuredGameId ? games.find((g) => g.id === featuredGameId) : games[0]
  const featuredStats = featuredGame ? statsByGame[featuredGame.id] : null

  const showSpotlight = Boolean(featuredGame && featuredStats && !query && category === "all")

  return (
    <div className="chance-home-feed mx-auto w-full max-w-none">
      <PlayToolbar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        resultCount={filtered.length}
        totalLive={totalLive}
        totalInQueue={totalInQueue}
      />

      {showSpotlight && featuredGame && featuredStats ? (
        <PlaySpotlight game={featuredGame} stats={featuredStats} />
      ) : null}

      <section aria-labelledby="play-library-heading">
        <div className="chance-section-head">
          <h2 id="play-library-heading" className="chance-section-title">
            {category === "all" && !query ? "Browse library" : "Results"}
          </h2>
          {query ? (
            <button
              type="button"
              className="chance-link-subtle text-sm"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <EmptyState className="chance-premium-card py-12">
            <p className="chance-text-caption">
              No games match that filter.{" "}
              <button
                type="button"
                className="font-medium text-[var(--chance-brand)] hover:underline"
                onClick={() => {
                  setQuery("")
                  setCategory("all")
                }}
              >
                Reset filters
              </button>
            </p>
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((game) => (
              <li key={game.id}>
                <PlayGameCard
                  game={game}
                  stats={
                    statsByGame[game.id] ?? {
                      gameId: game.id,
                      inQueue: 0,
                      liveMatches: 0,
                      waitingLobbies: 0,
                      playersLive: 0,
                      estQueueSec: null,
                    }
                  }
                  featured={showSpotlight && game.id === featuredGameId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
