"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import LandingFooter from "@/components/landing/landing-footer"
import LandingHeader from "@/components/landing/landing-header"
import LandingMobileHeader from "@/components/landing/landing-mobile-header"
import LandingPageMobile from "@/components/landing/landing-page-mobile"
import LandingLiveArena from "@/components/landing/landing-live-arena"
import LandingMockup from "@/components/landing/landing-mockup"
import { useCountUp } from "@/components/landing/use-count-up"
import { onLandingHashClick, scrollToLandingSection } from "@/components/landing/landing-scroll"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"
import {
  EMPTY_LANDING_LIVE_METRICS,
  LANDING_SHOWCASE_LABELS,
  buildLandingLiveMetrics,
  type LandingLiveMetrics,
} from "@/lib/landing-live-metrics"

export type LandingGame = {
  id: string
  name: string
  description: string | null
  min_bet: number
  max_bet: number
  playersLive?: number
}

const LOOP = ["Home", "Play", "Queue", "Lobby", "Match", "Results", "Rank"]

/** @deprecated Pre-live-metrics prop shape — mapped when `live` is missing (HMR / stale bundles). */
type LegacyLandingStats = {
  activePlayers?: number
  matchesPlayed?: number
  tokensWon?: number
  gamesCompleted?: number
}

type LandingPageClientProps = {
  games: LandingGame[]
  live?: LandingLiveMetrics
  stats?: LegacyLandingStats
}

function resolveLandingLive(live?: Partial<LandingLiveMetrics>, stats?: LegacyLandingStats): LandingLiveMetrics {
  if (live) {
    const legacy = live as Partial<LandingLiveMetrics> & {
      tokensInCirculation?: number
      gamesAvailable?: number
    }
    return buildLandingLiveMetrics({
      gamesPlayed: legacy.gamesPlayed ?? legacy.matchesDecided ?? 0,
      tokensInPlay: legacy.tokensInPlay ?? legacy.tokensInCirculation ?? legacy.tokensEarned ?? 0,
      moneyMadeUsd: legacy.moneyMadeUsd ?? 0,
      playersOnline: legacy.playersOnline ?? 0,
      matchesLive: legacy.matchesLive ?? 0,
      inQueue: legacy.inQueue ?? 0,
      openLobbies: legacy.openLobbies ?? 0,
      registeredPlayers: legacy.registeredPlayers ?? 0,
      openTournaments: legacy.openTournaments ?? 0,
      playersInArena: legacy.playersInArena ?? 0,
      tournamentsLive: legacy.tournamentsLive ?? 0,
      matchesDecided: legacy.matchesDecided ?? 0,
      tokensEarned: legacy.tokensEarned ?? 0,
    })
  }
  if (stats) {
    return buildLandingLiveMetrics({
      gamesPlayed: stats.matchesPlayed ?? stats.gamesCompleted ?? 0,
      tokensInPlay: stats.tokensWon ?? 0,
      moneyMadeUsd: 0,
      playersOnline: 0,
      matchesLive: 0,
      inQueue: 0,
      openLobbies: 0,
      registeredPlayers: stats.activePlayers ?? 0,
      openTournaments: 0,
      playersInArena: stats.activePlayers ?? stats.gamesCompleted ?? 0,
      tournamentsLive: 0,
      matchesDecided: stats.matchesPlayed ?? stats.gamesCompleted ?? 0,
      tokensEarned: stats.tokensWon ?? 0,
    })
  }
  return EMPTY_LANDING_LIVE_METRICS
}

function useInView(threshold = 0.15) {
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

export default function LandingPageClient({ games, live: liveProp, stats }: LandingPageClientProps) {
  const live = resolveLandingLive(liveProp, stats)

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    requestAnimationFrame(() => scrollToLandingSection(hash))
  }, [])

  const recordRef = useInView(0.2)
  const recordGames = useCountUp(live.gamesPlayed, 1800, recordRef.visible)
  const recordTokens = useCountUp(live.tokensInPlay, 1800, recordRef.visible)
  const recordMoney = useCountUp(live.moneyMadeUsd, 1800, recordRef.visible)

  const spotlightGames = (games ?? []).slice(0, 3)
  const arenaActive = live.matchesLive > 0 || live.playersOnline > 0 || live.inQueue > 0

  return (
    <div className="chance-landing chance-competitive-theme min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)]">
      <div className="chance-landing-ambient" aria-hidden />
      <div className="chance-landing-ambient-hero" aria-hidden />
      <LandingHeader arenaActive={arenaActive} />
      <LandingMobileHeader arenaActive={arenaActive} />
      <LandingPageMobile games={games ?? []} live={live} />

      <div className="chance-landing-desktop">
      <main className="chance-landing-main">
        {/* Hero — headline owns the frame; product floats as proof */}
        <section className="chance-landing-panel chance-landing-panel--hero" aria-labelledby="landing-hero-title">
          <div className="chance-landing-hero-inner">
            <div className="chance-landing-hero-copy">
              <LandingLiveArena live={live} variant="strip" />
              <h1 id="landing-hero-title" className="chance-landing-display-xl">
                Prove you&apos;re
                <span className="chance-landing-display-accent"> better.</span>
              </h1>
              <p className="chance-landing-hero-lede">
                Skill beats luck. Every match builds your reputation. Your rank remembers.
              </p>
              <div className="chance-landing-hero-actions">
                <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-pressable chance-landing-cta-lg">
                  Enter the arena
                </Link>
                <a href="#games" className="chance-hero-cta-ghost chance-focus-ring chance-landing-cta-lg" onClick={(e) => onLandingHashClick(e, "#games")}>
                  Browse games
                </a>
              </div>
            </div>
            <div className="chance-landing-hero-product">
              <LandingMockup
                variant="hero"
                live={{ playersOnline: live.playersOnline, matchesLive: live.matchesLive, inQueue: live.inQueue }}
              />
            </div>
          </div>
          <a
            href="#story"
            className="chance-landing-scroll-hint chance-focus-ring"
            aria-label="Scroll to learn more"
            onClick={(e) => onLandingHashClick(e, "#story")}
          >
            <ChevronDown className="size-6" strokeWidth={1.5} />
          </a>
        </section>

        {/* Three moves */}
        <section id="story" className="chance-landing-panel chance-landing-panel--story" aria-labelledby="landing-story">
          <div className="chance-landing-panel-inner chance-landing-panel-inner--wide">
            <p className="chance-landing-eyebrow">How you win</p>
            <h2 id="landing-story" className="chance-landing-display-lg">
              Three moves.
              <br />
              One outcome.
            </h2>
            <ol className="chance-landing-story-list">
              <li>
                <span className="chance-landing-story-index">01</span>
                <div>
                  <p className="chance-landing-story-title">Pick your battlefield</p>
                  <p className="chance-landing-story-line">Go where your skill hits hardest.</p>
                </div>
              </li>
              <li>
                <span className="chance-landing-story-index">02</span>
                <div>
                  <p className="chance-landing-story-title">Queue with intent</p>
                  <p className="chance-landing-story-line">Real opponents. Real stakes. No house.</p>
                </div>
              </li>
              <li>
                <span className="chance-landing-story-index">03</span>
                <div>
                  <p className="chance-landing-story-title">Earn every win</p>
                  <p className="chance-landing-story-line">Take the pot. Watch your record move.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Featured games — alternating rhythm */}
        {spotlightGames.map((game, i) => {
          const name = getGameDisplayName(game.name)
          const thumb = getGameThumbnail(game.name)
          const reversed = i % 2 === 1
          return (
            <section
              key={game.id}
              id={i === 0 ? "games" : undefined}
              className={`chance-landing-panel chance-landing-panel--game ${reversed ? "chance-landing-panel--game-reversed" : ""} chance-landing-panel--game-tone-${i % 3}`}
              aria-labelledby={`game-${game.id}`}
            >
              <div className="chance-landing-panel-inner">
                <div className="chance-landing-game-copy">
                  <p className="chance-landing-eyebrow">
                    {game.playersLive ? (
                      <>
                        <span className="chance-landing-inline-live" aria-hidden /> {game.playersLive} in match now
                      </>
                    ) : (
                      "Head-to-head ranked"
                    )}
                  </p>
                  <h2 id={`game-${game.id}`} className="chance-landing-display-lg">
                    {name}
                  </h2>
                  <p className="chance-landing-lede chance-landing-lede--tight">
                    {game.description ?? "Outplay them. Leave with the tokens."}
                  </p>
                  <p className="chance-landing-stakes chance-text-mono">
                    {game.min_bet}–{game.max_bet} tokens per match
                  </p>
                  <Link href={`/games/${game.id}`} className="chance-hero-cta-primary chance-focus-ring chance-landing-cta-lg mt-10 inline-flex">
                    Enter queue
                  </Link>
                </div>
                <div className="chance-landing-game-backdrop">
                  <div className="chance-landing-game-backdrop-glow" aria-hidden />
                  <Image src={thumb} alt="" fill className="object-contain p-3" sizes="(max-width:900px) 90vw, 380px" priority={i === 0} />
                </div>
              </div>
            </section>
          )
        })}

        {/* Competitive loop */}
        <section className="chance-landing-panel chance-landing-panel--journey" aria-labelledby="landing-journey">
          <div className="chance-landing-panel-inner">
            <p className="chance-landing-eyebrow">Competitive loop</p>
            <h2 id="landing-journey" className="sr-only">
              Player journey through ChanceUS
            </h2>
            <p className="chance-landing-journey-line" aria-label="Player journey">
              {LOOP.map((word, i) => (
                <span key={word}>
                  <span className="chance-landing-journey-word">{word}</span>
                  {i < LOOP.length - 1 ? <span className="chance-landing-journey-sep" aria-hidden /> : null}
                </span>
              ))}
            </p>
            <p className="chance-landing-lede mt-12 max-w-2xl">
              One ecosystem — from opening the app to holding rank. Every screen is built for competition, not browsing.
            </p>
          </div>
        </section>

        {/* Tournaments — in-page anchor (app route requires sign-in) */}
        <section id="tournaments" className="chance-landing-panel chance-landing-panel--tournaments" aria-labelledby="landing-tournaments">
          <div className="chance-landing-panel-inner chance-landing-tournaments-layout">
            <div>
              <p className="chance-landing-eyebrow">
                {live.tournamentsLive > 0 ? (
                  <>
                    <span className="chance-landing-inline-live" aria-hidden /> {live.tournamentsLive} bracket
                    {live.tournamentsLive === 1 ? "" : "s"} live
                  </>
                ) : (
                  "Tournaments"
                )}
              </p>
              <h2 id="landing-tournaments" className="chance-landing-display-lg">
                Run the
                <br />
                bracket.
              </h2>
              <p className="chance-landing-lede mt-8 max-w-xl">
                Open brackets. Winner-take-all pots. A stage when head-to-head isn&apos;t enough — prove it in front of everyone.
              </p>
              <div className="chance-landing-hero-actions mt-10 !justify-start">
                <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-landing-cta-lg">
                  Join a bracket
                </Link>
                <Link href="/auth/login" className="chance-hero-cta-ghost chance-focus-ring chance-landing-cta-lg">
                  Sign in to compete
                </Link>
              </div>
            </div>
            <ul className="chance-landing-tournament-feats" aria-label="Tournament features">
              {["Single elimination", "Live brackets", "Token prizes", "Seasonal ladders"].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Community */}
        <section id="community" className="chance-landing-panel chance-landing-panel--community" aria-labelledby="landing-community">
          <div className="chance-landing-panel-inner chance-landing-community-layout">
            <div>
              <p className="chance-landing-eyebrow">Community</p>
              <h2 id="landing-community" className="chance-landing-display-lg">
                Never
                <br />
                sleeps.
              </h2>
              <p className="chance-landing-lede mt-8 max-w-xl">
                Friends online. Voice rooms open. Tables running. Leaderboards moving while you queue.
              </p>
            </div>
            <LandingLiveArena live={live} variant="grid" />
          </div>
          <ul className="chance-landing-community-tags chance-landing-panel-inner" aria-label="Community surfaces">
            {["Friends", "Live Call", "Spectate", "Tournaments", "Rankings"].map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <div className="chance-landing-community-glow" aria-hidden />
        </section>

        {/* Rank */}
        <section className="chance-landing-panel chance-landing-panel--progress" aria-labelledby="landing-progress">
          <div className="chance-landing-panel-inner chance-landing-progress-layout">
            <div>
              <p className="chance-landing-eyebrow">Progression</p>
              <h2 id="landing-progress" className="chance-landing-display-lg">
                Your rank
                <br />
                remembers.
              </h2>
              <p className="chance-landing-lede mt-8 max-w-lg">
                Streaks. History. Seasonal ladders. A profile that reads like a career — not a buried settings page.
              </p>
            </div>
            <div className="chance-landing-rank-stack" aria-hidden>
              {["Diamond", "Platinum", "Gold"].map((tier) => (
                <span key={tier} className="chance-landing-rank-tier">
                  {tier}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Platform record — real totals only */}
        <section ref={recordRef.ref} className="chance-landing-panel chance-landing-panel--record" aria-labelledby="landing-record">
          <div className="chance-landing-panel-inner">
            <p className="chance-landing-eyebrow">Platform record</p>
            <h2 id="landing-record" className="chance-landing-display-md">
              Every match matters.
            </h2>
            <dl className="chance-landing-stats-row">
              <div className="chance-landing-stat-item">
                <dd className="chance-landing-stat-huge" data-zero={live.gamesPlayed === 0 || undefined}>
                  {recordGames.toLocaleString()}
                </dd>
                <dt className="chance-landing-stat-label">{LANDING_SHOWCASE_LABELS.gamesPlayed}</dt>
              </div>
              <div className="chance-landing-stat-item">
                <dd className="chance-landing-stat-huge" data-zero={live.tokensInPlay === 0 || undefined}>
                  {recordTokens.toLocaleString()}
                </dd>
                <dt className="chance-landing-stat-label">{LANDING_SHOWCASE_LABELS.tokensInPlay}</dt>
              </div>
              <div className="chance-landing-stat-item">
                <dd className="chance-landing-stat-huge" data-zero={live.moneyMadeUsd === 0 || undefined}>
                  ${recordMoney.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
                <dt className="chance-landing-stat-label">{LANDING_SHOWCASE_LABELS.moneyMade}</dt>
              </div>
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="chance-landing-panel chance-landing-panel--final" aria-labelledby="landing-cta">
          <div className="chance-landing-panel-inner chance-landing-final-inner">
            <p className="chance-landing-eyebrow">Your move</p>
            <h2 id="landing-cta" className="chance-landing-display-xl">
              Prove it.
            </h2>
            <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-pressable chance-landing-cta-lg mt-12">
              Enter the arena
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
      </div>
    </div>
  )
}
