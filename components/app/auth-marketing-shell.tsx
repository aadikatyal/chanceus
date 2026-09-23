import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import AuthLiveStrip from "@/components/auth/auth-live-strip"
import LandingMockup from "@/components/landing/landing-mockup"
import type { PlatformLiveStats } from "@/lib/platform-live-stats"

export type AuthShellVariant = "login" | "signup"

type AuthMarketingShellProps = {
  children: ReactNode
  variant: AuthShellVariant
  live: PlatformLiveStats
}

const COPY: Record<AuthShellVariant, { eyebrow: string; headline: string; sub: string }> = {
  login: {
    eyebrow: "Welcome back",
    headline: "Your next match is waiting.",
    sub: "Continue your climb. Every match counts.",
  },
  signup: {
    eyebrow: "Enter the arena",
    headline: "Ready to prove yourself?",
    sub: "Build your reputation from match one.",
  },
}

export default function AuthMarketingShell({ children, variant, live }: AuthMarketingShellProps) {
  const copy = COPY[variant]

  return (
    <div className="chance-auth-marketing-shell chance-competitive-theme min-h-screen min-h-[100dvh] text-[var(--chance-fg)]">
      <div className="chance-auth-ambient" aria-hidden />
      <div className="chance-auth-ambient-glow" aria-hidden />
      <div className="chance-auth-vignette" aria-hidden />

      <header className="chance-auth-topbar">
        <Link href="/" className="chance-auth-logo chance-focus-ring">
          <Image src="/chanceus-eagle.png" alt="ChanceUS" width={40} height={40} className="size-10 object-contain" priority />
          <span className="chance-auth-logo-text">ChanceUS</span>
        </Link>
      </header>

      <div className="chance-auth-grid">
        <section className="chance-auth-story chance-auth-enter" aria-label="ChanceUS competitive platform">
          <p className="chance-auth-eyebrow">{copy.eyebrow}</p>
          <h2 className="chance-auth-headline">{copy.headline}</h2>
          <p className="chance-auth-subline">{copy.sub}</p>
          <AuthLiveStrip live={live} />
          <div className="chance-auth-preview chance-auth-enter chance-auth-enter--delayed">
            <LandingMockup
              variant="compact"
              live={{ playersOnline: live.playersOnline, matchesLive: live.matchesLive, inQueue: live.inQueue }}
            />
          </div>
        </section>

        <main className="chance-auth-main">
          <div className="chance-auth-panel-wrap chance-auth-enter chance-auth-enter--panel">{children}</div>
        </main>
      </div>
    </div>
  )
}
