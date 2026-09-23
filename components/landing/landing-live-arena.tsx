"use client"

import { useCountUp } from "@/components/landing/use-count-up"
import { LANDING_SHOWCASE_LABELS, type LandingLiveMetrics } from "@/lib/landing-live-metrics"

type LandingLiveArenaProps = {
  live: LandingLiveMetrics
  animate?: boolean
  variant?: "strip" | "grid"
}

export default function LandingLiveArena({ live, animate = true, variant = "strip" }: LandingLiveArenaProps) {
  const realtimeActive =
    live.playersOnline > 0 || live.matchesLive > 0 || live.inQueue > 0 || live.tournamentsLive > 0

  const items = [
    { key: "played", label: LANDING_SHOWCASE_LABELS.gamesPlayed, value: live.gamesPlayed, format: "number" as const },
    { key: "tokens", label: LANDING_SHOWCASE_LABELS.tokensInPlay, value: live.tokensInPlay, format: "number" as const },
    { key: "money", label: LANDING_SHOWCASE_LABELS.moneyMade, value: live.moneyMadeUsd, format: "usd" as const },
  ]

  return (
    <div
      className={`chance-landing-live ${variant === "grid" ? "chance-landing-live--grid" : "chance-landing-live--strip"}`}
      role="status"
      aria-live="polite"
      aria-label={realtimeActive ? "Live arena activity" : "Platform at a glance"}
    >
      <div className="chance-landing-live-beacon" data-active={realtimeActive || undefined}>
        <span className="chance-landing-live-beacon-dot" aria-hidden />
        <span className="chance-landing-live-beacon-label">{realtimeActive ? "Live arena" : "Arena open"}</span>
      </div>
      <ul className="chance-landing-live-list chance-landing-live-list--showcase">
        {items.map((item) => (
          <li key={item.key} className="chance-landing-live-item">
            <ShowcaseValue value={item.value} animate={animate} format={item.format} />
            <span className="chance-landing-live-item-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ShowcaseValue({
  value,
  animate,
  format,
}: {
  value: number
  animate: boolean
  format: "number" | "usd"
}) {
  const display = useCountUp(value, 1200, animate && value > 0)
  const text =
    format === "usd"
      ? `$${display.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : display.toLocaleString()

  return (
    <span className="chance-landing-live-value chance-text-mono" data-zero={value === 0 || undefined}>
      {text}
    </span>
  )
}
