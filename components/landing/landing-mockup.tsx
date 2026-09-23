"use client"

import Image from "next/image"
import type { LandingLiveMetrics } from "@/lib/landing-live-metrics"

type LandingMockupProps = {
  variant?: "hero" | "compact"
  live?: Pick<LandingLiveMetrics, "playersOnline" | "matchesLive" | "inQueue">
}

const NAV = ["Home", "Play", "Queue", "Wallet", "Social"]

/**
 * Authenticated-shell preview — presentation only, fed by real landing metrics when available.
 */
export default function LandingMockup({ variant = "hero", live }: LandingMockupProps) {
  const queueActive = (live?.inQueue ?? 0) > 0
  const matchesLive = (live?.matchesLive ?? 0) > 0
  const online = live?.playersOnline ?? 0

  return (
    <div
      className={`chance-landing-mockup-stage ${variant === "hero" ? "chance-landing-mockup-stage--hero" : ""}`}
      aria-hidden
    >
      <div className="chance-landing-mockup-spotlight" />
      <div className="chance-landing-mockup-glow" />
      <div className="chance-landing-mockup-device">
        <div className="chance-landing-mockup-chrome">
          <span className="chance-landing-mockup-dot" />
          <span className="chance-landing-mockup-dot" />
          <span className="chance-landing-mockup-dot" />
          <span className="chance-landing-mockup-chrome-title">ChanceUS</span>
        </div>
        <div className="chance-landing-mockup-screen">
          <aside className="chance-landing-mockup-sidebar">
            <Image src="/chanceus-eagle.png" alt="" width={48} height={48} className="chance-landing-mockup-eagle" />
            {NAV.map((label) => {
              const isPlay = label === "Play"
              const isQueue = label === "Queue"
              const active = isPlay || (isQueue && queueActive)
              return (
                <div
                  key={label}
                  className={`chance-landing-mockup-nav-row ${active ? "is-active" : ""} ${isQueue && queueActive ? "is-queue-live" : ""}`}
                >
                  <span className="chance-landing-mockup-nav-dot" />
                  <span className="chance-landing-mockup-nav-label">{label}</span>
                  {isQueue && queueActive ? <span className="chance-landing-mockup-queue-pulse" /> : null}
                </div>
              )
            })}
          </aside>
          <div className="chance-landing-mockup-body">
            <div className="chance-landing-mockup-topbar">
              <span className="chance-landing-mockup-search">Search players, games…</span>
              {online > 0 ? (
                <span className="chance-landing-mockup-online">
                  <span className="chance-landing-mockup-online-dot" />
                  {online} online
                </span>
              ) : null}
              <span className="chance-landing-mockup-balance">
                <span className="chance-landing-mockup-balance-shimmer">1,000</span>
              </span>
              <span className="chance-landing-mockup-avatar" />
            </div>
            <div className="chance-landing-mockup-content">
              <div className={`chance-landing-mockup-hero-card ${matchesLive ? "is-live" : ""}`}>
                <div className="chance-landing-mockup-hero-visual">
                  <div className="chance-landing-mockup-hero-visual-bg" aria-hidden />
                  <Image
                    src="/chanceus-eagle.png"
                    alt=""
                    width={88}
                    height={88}
                    className="chance-landing-mockup-hero-eagle"
                    priority
                  />
                </div>
                <div className="chance-landing-mockup-hero-copy">
                  <p className="chance-landing-mockup-kicker">{matchesLive ? "Match live" : "Skill-based gaming"}</p>
                  <p className="chance-landing-mockup-headline">
                    Prove it.
                    <br />
                    Win it.
                  </p>
                </div>
              </div>
              <div className="chance-landing-mockup-tiles">
                <div className={`chance-landing-mockup-tile chance-landing-mockup-tile--hero ${matchesLive ? "is-active" : ""}`}>
                  <Image src="/4-in-a-row.JPG" alt="" fill className="object-cover" sizes="(max-width:1200px) 50vw, 600px" priority />
                  <span className="chance-landing-mockup-tile-label">Four in a Row</span>
                  {matchesLive ? <span className="chance-landing-mockup-tile-live">Live</span> : null}
                </div>
                <div className="chance-landing-mockup-tile">
                  <Image src="/math-blitz.JPG" alt="" fill className="object-cover" sizes="400px" />
                  <span className="chance-landing-mockup-tile-label">Math Blitz</span>
                </div>
                <div className="chance-landing-mockup-tile">
                  <Image src="/trivia-blitz.JPG" alt="" fill className="object-cover" sizes="400px" />
                  <span className="chance-landing-mockup-tile-label">Trivia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
