import type { PlatformLiveStats } from "@/lib/platform-live-stats"

type AuthLiveStripProps = {
  live: PlatformLiveStats
}

function formatStat(value: number) {
  return value.toLocaleString()
}

export default function AuthLiveStrip({ live }: AuthLiveStripProps) {
  const active = live.playersOnline > 0 || live.matchesLive > 0 || live.inQueue > 0 || live.tournamentsLive > 0

  const items = [
    { label: "Players online", value: live.playersOnline },
    { label: "Matches live", value: live.matchesLive },
    { label: "In queue", value: live.inQueue },
    { label: "Tournaments live", value: live.tournamentsLive },
  ]

  return (
    <div className="chance-auth-live" role="status" aria-live="polite">
      <div className="chance-auth-live-beacon" data-active={active || undefined}>
        <span className="chance-auth-live-dot" aria-hidden />
        <span>{active ? "Arena active" : "Arena open"}</span>
      </div>
      <ul className="chance-auth-live-list">
        {items.map((item) => (
          <li key={item.label}>
            <span className="chance-auth-live-value chance-text-mono" data-zero={item.value === 0 || undefined}>
              {formatStat(item.value)}
            </span>
            <span className="chance-auth-live-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
