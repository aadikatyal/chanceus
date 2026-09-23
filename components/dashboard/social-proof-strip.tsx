"use client"

import OnlineUsersCount from "@/components/dashboard/online-users-count"

export default function SocialProofStrip() {
  return (
    <div
      className="chance-hero-social transition-[border-color,background] duration-[var(--chance-duration-ui)] hover:border-[color-mix(in_srgb,var(--chance-brand)_25%,transparent)]"
      aria-label="Players online community activity"
    >
      <div className="chance-avatar-stack" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i}>{String.fromCharCode(65 + i)}</span>
        ))}
      </div>
      <p className="chance-text-caption m-0 pr-1 text-[var(--chance-fg)]">
        <span className="chance-text-mono font-semibold text-[var(--chance-brand)]">
          <OnlineUsersCount />+
        </span>{" "}
        players online
      </p>
    </div>
  )
}
