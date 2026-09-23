"use client"

import Image from "next/image"
import type { LandingLiveMetrics } from "@/lib/landing-live-metrics"

type LandingPhoneMockupProps = {
  live?: Pick<LandingLiveMetrics, "playersOnline" | "matchesLive" | "inQueue">
  priority?: boolean
}

/** Phone-frame product preview for mobile landing — not a scaled desktop mockup. */
export default function LandingPhoneMockup({ live, priority = true }: LandingPhoneMockupProps) {
  const queueActive = (live?.inQueue ?? 0) > 0

  return (
    <div className="chance-landing-phone-stage" aria-hidden>
      <div className="chance-landing-phone-glow" />
      <div className="chance-landing-phone-device">
        <div className="chance-landing-phone-notch" />
        <div className="chance-landing-phone-screen">
          <div className="chance-landing-phone-status">
            <Image src="/chanceus-eagle.png" alt="" width={28} height={28} className="size-7 object-contain" priority={priority} />
            <span className="chance-landing-phone-status-title">Play</span>
            {queueActive ? <span className="chance-landing-phone-live">Live queue</span> : null}
          </div>
          <div className="chance-landing-phone-hero-card">
            <p className="chance-landing-phone-kicker">Ranked skill</p>
            <p className="chance-landing-phone-headline">Prove it.</p>
            <span className={`chance-landing-phone-cta ${queueActive ? "is-pulse" : ""}`}>Queue now</span>
          </div>
          <div className="chance-landing-phone-tiles">
            <div className="chance-landing-phone-tile chance-landing-phone-tile--large">
              <Image src="/4-in-a-row.JPG" alt="" fill className="object-cover" sizes="(max-width:480px) 85vw" priority={priority} />
            </div>
            <div className="chance-landing-phone-tile">
              <Image src="/math-blitz.JPG" alt="" fill className="object-cover" sizes="200px" loading={priority ? undefined : "lazy"} />
            </div>
            <div className="chance-landing-phone-tile">
              <Image src="/trivia-blitz.JPG" alt="" fill className="object-cover" sizes="200px" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
