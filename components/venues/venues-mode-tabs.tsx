"use client"

export type VenuesMode = "player" | "host"

type VenuesModeTabsProps = {
  mode: VenuesMode
  onChange: (mode: VenuesMode) => void
}

export default function VenuesModeTabs({ mode, onChange }: VenuesModeTabsProps) {
  return (
    <nav className="chance-venues-mode-tabs" aria-label="Venues mode">
      {(
        [
          ["player", "Discover events"],
          ["host", "Host mode"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={`chance-venues-mode-tab ${mode === id ? "is-active" : ""}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
