"use client"

import { Search } from "lucide-react"

type PlayerDiscoveryHeroProps = {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onSearch: () => void
  isSearching: boolean
}

export default function PlayerDiscoveryHero({
  searchTerm,
  onSearchTermChange,
  onSearch,
  isSearching,
}: PlayerDiscoveryHeroProps) {
  return (
    <section className="chance-discovery-hero chance-hero-cinematic" aria-labelledby="discovery-hero-title">
      <div className="chance-discovery-hero-glow" aria-hidden />
      <div className="chance-hero-content chance-discovery-hero-content">
        <div className="chance-hero-main max-w-2xl">
          <p className="chance-hero-kicker">
            <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
            Network
          </p>
          <h1 id="discovery-hero-title" className="chance-hero-title">
            Find your squad
          </h1>
          <p className="mt-3 max-w-lg text-[0.9375rem] leading-[1.55] tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            Build your competitive circle — rematch rivals, queue with friends, and climb together.
          </p>

          <form
            className="chance-discovery-search mt-5"
            onSubmit={(e) => {
              e.preventDefault()
              onSearch()
            }}
          >
            <Search className="chance-discovery-search-icon size-5 stroke-[1.75]" aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Search handle or display name…"
              className="chance-discovery-search-input"
              aria-label="Search players"
            />
            <button type="submit" disabled={isSearching} className="chance-hero-cta-primary chance-focus-ring chance-discovery-search-btn">
              {isSearching ? "Searching…" : "Search"}
            </button>
          </form>
          <p className="chance-text-caption mt-2">Discovery first — search when you know who you&apos;re looking for.</p>
        </div>
      </div>
    </section>
  )
}
