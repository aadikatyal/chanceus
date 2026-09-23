"use client"

import { Search } from "lucide-react"
import { PLAY_CATEGORIES, type PlayCategoryId } from "@/lib/games/play-catalog"

type PlayToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  category: PlayCategoryId
  onCategoryChange: (id: PlayCategoryId) => void
  resultCount: number
  totalLive: number
  totalInQueue: number
}

export default function PlayToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  resultCount,
  totalLive,
  totalInQueue,
}: PlayToolbarProps) {
  return (
    <div className="chance-play-toolbar">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="chance-display-title">Play</h1>
          <p className="mt-1 text-[0.9375rem] tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            Browse the library, join a queue, or jump into an open lobby.
          </p>
        </div>
        <dl className="flex flex-wrap gap-2 text-[0.8125rem]">
          <div className="chance-play-stat-pill">
            <span className="chance-text-mono font-semibold tabular-nums text-[var(--chance-brand)]">{totalLive}</span>
            <span className="text-[var(--chance-muted-fg)]">live</span>
          </div>
          <div className="chance-play-stat-pill">
            <span className="chance-text-mono font-semibold tabular-nums text-[var(--chance-brand)]">{totalInQueue}</span>
            <span className="text-[var(--chance-muted-fg)]">searching</span>
          </div>
          <div className="chance-play-stat-pill">
            <span className="chance-text-mono font-semibold tabular-nums">{resultCount}</span>
            <span className="text-[var(--chance-muted-fg)]">games shown</span>
          </div>
        </dl>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--chance-muted-fg)]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search games…"
            className="chance-search-rich chance-focus-ring h-11 w-full pl-9 pr-3 text-sm tracking-[-0.01em] text-[var(--chance-fg)] placeholder:text-[var(--chance-muted-fg)]"
            aria-label="Search games"
          />
        </label>
      </div>

      <div className="chance-play-categories mt-4" role="tablist" aria-label="Game categories">
        {PLAY_CATEGORIES.map((cat) => {
          const active = category === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(cat.id)}
              className={`chance-play-category-pill chance-focus-ring ${active ? "chance-play-category-pill--active" : ""}`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
