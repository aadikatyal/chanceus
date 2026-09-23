"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  Flame,
  Gamepad2,
  Mic,
  Radio,
  Search,
  Swords,
  Trophy,
  Users,
} from "lucide-react"
import LandingFooter from "@/components/landing/landing-footer"
import LandingHeader from "@/components/landing/landing-header"
import LandingMockup from "@/components/landing/landing-mockup"
import { useCountUp } from "@/components/landing/use-count-up"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"

export type LandingGame = {
  id: string
  name: string
  description: string | null
  min_bet: number
  max_bet: number
  playersLive?: number
}

export type LandingStats = {
  activePlayers: number
  matchesPlayed: number
  tokensWon: number
  gamesCompleted: number
}

const FLOW = [
  { label: "Home", href: "/dashboard" },
  { label: "Play", href: "/games" },
  { label: "Queue", href: "/games" },
  { label: "Lobby", href: "/games" },
  { label: "Match", href: "/games" },
  { label: "Results", href: "/matches" },
  { label: "Progress", href: "/rankings" },
]

const COMMUNITY = [
  { icon: Users, title: "Friends", copy: "See who's online, rematch rivals, climb together." },
  { icon: Mic, title: "Voice rooms", copy: "Hang out before queue — party up on Live Call." },
  { icon: Radio, title: "Live matches", copy: "Spectate tables in progress across the platform." },
  { icon: Trophy, title: "Tournaments", copy: "Brackets, stakes, and scheduled run-it-back nights." },
  { icon: Swords, title: "Leaderboards", copy: "Ranked ladders that reward consistency, not luck." },
]

type LandingPageClientProps = {
  games: LandingGame[]
  stats: LandingStats
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

export default function LandingPageClient({ games, stats }: LandingPageClientProps) {
  const statsRef = useInView(0.25)
  const players = useCountUp(stats.activePlayers, 1600, statsRef.visible)
  const matches = useCountUp(stats.matchesPlayed, 1600, statsRef.visible)
  const tokens = useCountUp(stats.tokensWon, 1600, statsRef.visible)
  const completed = useCountUp(stats.gamesCompleted, 1600, statsRef.visible)

  return (
    <div className="chance-landing dark chance-competitive-theme min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]">
      <div className="chance-landing-ambient" aria-hidden />
      <LandingHeader />

      <main className="chance-landing-main">
        {/* Hero */}
        <section className="chance-landing-hero" aria-labelledby="landing-hero-title">
          <div className="chance-landing-hero-grid mx-auto max-w-[90rem] px-4 pb-16 pt-[calc(var(--chance-header-h)+2rem)] sm:px-6 lg:px-8 lg:pb-24 lg:pt-[calc(var(--chance-header-h)+3rem)]">
            <div className="chance-landing-hero-copy">
              <p className="chance-hero-kicker">
                <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
                Competitive gaming
              </p>
              <h1 id="landing-hero-title" className="chance-landing-hero-title">
                Play.
                <br />
                Compete.
                <br />
                Win.
              </h1>
              <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-[var(--chance-muted-fg)]">
                Skill decides every match. Stake tokens, beat real opponents, and build a record that means something.
              </p>
              <div className="chance-hero-cta-row mt-8">
                <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-pressable">
                  Get started
                </Link>
                <a href="#community" className="chance-hero-cta-ghost chance-focus-ring">
                  Watch demo
                </a>
              </div>
            </div>
            <div className="chance-landing-hero-visual">
              <LandingMockup />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="chance-landing-section" aria-labelledby="landing-how">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
            <header className="chance-landing-section-head">
              <h2 id="landing-how" className="chance-landing-section-title">
                How it works
              </h2>
              <p className="chance-text-caption mt-2 max-w-lg">Three steps from idle to in-match.</p>
            </header>
            <ol className="chance-landing-steps">
              {[
                { n: "01", title: "Choose a game", body: "Four in a Row, Math Blitz, or Trivia — pick your edge.", icon: Gamepad2 },
                { n: "02", title: "Find a match", body: "Queue for stakes that fit your bankroll or invite a rival.", icon: Search },
                { n: "03", title: "Win tokens", body: "Outplay your opponent. Winner takes the pot.", icon: Trophy },
              ].map((step, i) => (
                <li key={step.n} className="chance-landing-step">
                  {i < 2 ? <span className="chance-landing-step-connector" aria-hidden /> : null}
                  <div className="chance-landing-step-icon">
                    <step.icon className="size-6 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
                  </div>
                  <p className="chance-text-mono text-xs font-semibold text-[var(--chance-brand)]">{step.n}</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="chance-text-caption mt-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Games */}
        <section id="games" className="chance-landing-section" aria-labelledby="landing-games">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
            <header className="chance-landing-section-head">
              <h2 id="landing-games" className="chance-landing-section-title">
                Games
              </h2>
              <p className="chance-text-caption mt-2">Head-to-head skill. Real stakes.</p>
            </header>
            <div className="chance-landing-games-track">
              {games.map((game, i) => {
                const name = getGameDisplayName(game.name)
                const thumb = getGameThumbnail(game.name)
                return (
                  <article key={game.id} className={`chance-landing-game-card ${i === 0 ? "is-featured" : ""}`}>
                    <Link href={`/games/${game.id}`} className="chance-landing-game-link chance-focus-ring group">
                      <div className="chance-landing-game-visual">
                        <Image src={thumb} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" sizes="(max-width:768px) 85vw, 360px" />
                        <div className="chance-landing-game-scrim" aria-hidden />
                        {(game.playersLive ?? 0) > 0 ? (
                          <span className="chance-play-live-badge">
                            <span className="chance-play-live-dot" aria-hidden />
                            {game.playersLive} live
                          </span>
                        ) : null}
                      </div>
                      <div className="chance-landing-game-body">
                        <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
                        <p className="chance-text-caption mt-1 line-clamp-2">{game.description}</p>
                        <p className="chance-text-mono mt-3 text-sm font-semibold tabular-nums text-[var(--chance-brand)]">
                          {game.min_bet}–{game.max_bet} tokens
                        </p>
                      </div>
                    </Link>
                  </article>
                )
              })}
              <article className="chance-landing-game-card chance-landing-game-card--soon">
                <div className="chance-landing-game-body flex h-full flex-col justify-center p-6">
                  <p className="chance-text-mono text-xs font-bold uppercase tracking-widest text-[var(--chance-muted-fg)]">Soon</p>
                  <h3 className="mt-2 text-lg font-semibold">More ranked modes</h3>
                  <p className="chance-text-caption mt-2">New skill games drop as the ladder grows.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Ecosystem flow */}
        <section className="chance-landing-section" aria-labelledby="landing-flow">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
            <header className="chance-landing-section-head">
              <h2 id="landing-flow" className="chance-landing-section-title">
                The competitive loop
              </h2>
              <p className="chance-text-caption mt-2 max-w-xl">One ecosystem — from opening the app to climbing rank.</p>
            </header>
            <div className="chance-landing-flow">
              {FLOW.map((node, i) => (
                <div key={node.label} className="chance-landing-flow-node">
                  <span className="chance-landing-flow-pill">{node.label}</span>
                  {i < FLOW.length - 1 ? <ArrowDown className="chance-landing-flow-arrow hidden sm:block" aria-hidden /> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community */}
        <section id="community" className="chance-landing-section" aria-labelledby="landing-community">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
            <header className="chance-landing-section-head">
              <h2 id="landing-community" className="chance-landing-section-title">
                Community
              </h2>
              <p className="chance-text-caption mt-2">The floor is always moving.</p>
            </header>
            <ul className="chance-landing-community-grid">
              {COMMUNITY.map((item) => (
                <li key={item.title} className="chance-premium-card chance-landing-community-card p-5 sm:p-6">
                  <item.icon className="size-5 text-[var(--chance-brand)]" aria-hidden />
                  <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                  <p className="chance-text-caption mt-2">{item.copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Progression */}
        <section className="chance-landing-section" aria-labelledby="landing-progress">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
            <div className="chance-landing-progress chance-premium-card overflow-hidden">
              <div className="chance-landing-progress-copy p-6 sm:p-10 lg:max-w-md">
                <h2 id="landing-progress" className="chance-landing-section-title text-2xl sm:text-3xl">
                  Progression that sticks
                </h2>
                <p className="chance-text-caption mt-3">Rank ladder, streaks, match history, and a career profile that follows every win.</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["Rank tiers & seasonal ladders", "Win streaks & achievement moments", "Full match history & rematch"].map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <Flame className="size-4 shrink-0 text-[var(--chance-brand)]" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring mt-8 inline-flex px-5 py-2.5 text-sm">
                  Build your record
                </Link>
              </div>
              <div className="chance-landing-progress-visual p-6 sm:p-8" aria-hidden>
                <div className="chance-landing-ladder">
                  {["Diamond", "Platinum", "Gold", "Silver"].map((tier, i) => (
                    <div key={tier} className="chance-landing-ladder-rung" style={{ ["--rung-i" as string]: i }}>
                      <span>{tier}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section ref={statsRef.ref} className="chance-landing-section" aria-labelledby="landing-stats">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
            <header className="chance-landing-section-head text-center">
              <h2 id="landing-stats" className="chance-landing-section-title">
                By the numbers
              </h2>
            </header>
            <dl className="chance-landing-stats-grid">
              <div>
                <dt className="chance-text-caption">Active players</dt>
                <dd className="chance-landing-stat-value">{players.toLocaleString()}+</dd>
              </div>
              <div>
                <dt className="chance-text-caption">Matches played</dt>
                <dd className="chance-landing-stat-value">{matches.toLocaleString()}+</dd>
              </div>
              <div>
                <dt className="chance-text-caption">Tokens won</dt>
                <dd className="chance-landing-stat-value">{tokens.toLocaleString()}+</dd>
              </div>
              <div>
                <dt className="chance-text-caption">Games completed</dt>
                <dd className="chance-landing-stat-value">{completed.toLocaleString()}+</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="chance-landing-section chance-landing-final" aria-labelledby="landing-cta">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 id="landing-cta" className="chance-landing-hero-title text-3xl sm:text-4xl md:text-5xl">
              Ready to prove you&apos;re better?
            </h2>
            <p className="chance-text-caption mx-auto mt-4 max-w-md text-base">Create your account. Queue your first match. Let skill do the talking.</p>
            <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-pressable mt-8 inline-flex min-h-11 px-8 py-3 text-base">
              Get started
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
