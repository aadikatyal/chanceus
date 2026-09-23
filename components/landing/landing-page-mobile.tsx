"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import LandingFooter from "@/components/landing/landing-footer"
import LandingLiveArena from "@/components/landing/landing-live-arena"
import LandingPhoneMockup from "@/components/landing/landing-phone-mockup"
import { useCountUp } from "@/components/landing/use-count-up"
import { onLandingHashClick, scrollToLandingSection } from "@/components/landing/landing-scroll"
import type { LandingGame } from "@/components/landing/landing-page-client"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"
import { LANDING_SHOWCASE_LABELS, type LandingLiveMetrics } from "@/lib/landing-live-metrics"

const LOOP = ["Home", "Play", "Queue", "Lobby", "Match", "Results", "Rank"]

type LandingPageMobileProps = {
  games: LandingGame[]
  live: LandingLiveMetrics
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

/** Same narrative as desktop — layout tuned in `chance-landing-mobile.css`. */
export default function LandingPageMobile({ games, live }: LandingPageMobileProps) {
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
  const mockupLive = {
    playersOnline: live.playersOnline,
    matchesLive: live.matchesLive,
    inQueue: live.inQueue,
  }

  return (
    <div className="chance-landing-mobile-root">
      <main className="chance-landing-main">
        <section className="chance-landing-panel chance-landing-panel--hero" aria-labelledby="mobile-hero-title">
          <div className="chance-landing-hero-inner">
            <div className="chance-landing-hero-copy">
              <p className="chance-landing-eyebrow chance-landing-hero-eyebrow">Skill-based gaming</p>
              <LandingLiveArena live={live} variant="strip" />
              <h1 id="mobile-hero-title" className="chance-landing-display-xl">
                Prove you&apos;re
                <span className="chance-landing-display-accent"> better.</span>
              </h1>
              <p className="chance-landing-hero-lede">
                Outcomes follow skill—not luck. Every match builds your reputation, and your rank remembers.
              </p>
              <div className="chance-landing-hero-actions">
                <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-pressable chance-landing-cta-lg">
                  Enter the arena
                </Link>
                <a
                  href="#games"
                  className="chance-hero-cta-ghost chance-focus-ring chance-landing-cta-lg"
                  onClick={(e) => onLandingHashClick(e, "#games")}
                >
                  Browse games
                </a>
              </div>
            </div>
            <div className="chance-landing-hero-product chance-landing-hero-product--phone">
              <LandingPhoneMockup live={mockupLive} priority />
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

        <section id="story" className="chance-landing-panel chance-landing-panel--story" aria-labelledby="mobile-story">
          <div className="chance-landing-panel-inner chance-landing-panel-inner--wide">
            <p className="chance-landing-eyebrow">How you win</p>
            <h2 id="mobile-story" className="chance-landing-display-lg">
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

        {spotlightGames.map((game, i) => {
          const name = getGameDisplayName(game.name)
          const thumb = getGameThumbnail(game.name)
          return (
            <section
              key={game.id}
              id={i === 0 ? "games" : undefined}
              className={`chance-landing-panel chance-landing-panel--game chance-landing-panel--game-tone-${i % 3}`}
              aria-labelledby={`mobile-game-${game.id}`}
            >
              <div className="chance-landing-panel-inner">
                <div className="chance-landing-game-backdrop">
                  <div className="chance-landing-game-backdrop-glow" aria-hidden />
                  <Image src={thumb} alt="" fill className="object-contain p-3" sizes="(max-width:480px) 92vw" priority={i === 0} loading={i === 0 ? undefined : "lazy"} />
                </div>
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
                  <h2 id={`mobile-game-${game.id}`} className="chance-landing-display-lg">
                    {name}
                  </h2>
                  <p className="chance-landing-lede chance-landing-lede--tight">
                    {game.description ?? "Outplay them. Leave with the tokens."}
                  </p>
                  <p className="chance-landing-stakes chance-text-mono">
                    {game.min_bet}–{game.max_bet} tokens per match
                  </p>
                  <Link href={`/games/${game.id}`} className="chance-hero-cta-primary chance-focus-ring chance-landing-cta-lg mt-10 inline-flex w-full justify-center sm:w-auto">
                    Enter queue
                  </Link>
                </div>
              </div>
            </section>
          )
        })}

        <section className="chance-landing-panel chance-landing-panel--journey" aria-labelledby="mobile-journey">
          <div className="chance-landing-panel-inner">
            <p className="chance-landing-eyebrow">Competitive loop</p>
            <h2 id="mobile-journey" className="sr-only">
              Player journey through ChanceUS
            </h2>
            <p className="chance-landing-journey-line" aria-label="Player journey">
              {LOOP.map((word, idx) => (
                <span key={word}>
                  <span className="chance-landing-journey-word">{word}</span>
                  {idx < LOOP.length - 1 ? <span className="chance-landing-journey-sep" aria-hidden /> : null}
                </span>
              ))}
            </p>
            <p className="chance-landing-lede mt-12 max-w-2xl">
              One ecosystem — from opening the app to holding rank. Every screen is built for competition, not browsing.
            </p>
          </div>
        </section>

        <section id="tournaments" className="chance-landing-panel chance-landing-panel--tournaments" aria-labelledby="mobile-tournaments">
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
              <h2 id="mobile-tournaments" className="chance-landing-display-lg">
                Run the
                <br />
                bracket.
              </h2>
              <p className="chance-landing-lede mt-8 max-w-xl">
                Open brackets. Winner-take-all pots. A stage when head-to-head isn&apos;t enough — prove it in front of everyone.
              </p>
              <div className="chance-landing-hero-actions mt-10">
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

        <section id="community" className="chance-landing-panel chance-landing-panel--community" aria-labelledby="mobile-community">
          <div className="chance-landing-panel-inner chance-landing-community-layout">
            <div>
              <p className="chance-landing-eyebrow">Community</p>
              <h2 id="mobile-community" className="chance-landing-display-lg">
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

        <section className="chance-landing-panel chance-landing-panel--progress" aria-labelledby="mobile-progress">
          <div className="chance-landing-panel-inner chance-landing-progress-layout">
            <div>
              <p className="chance-landing-eyebrow">Progression</p>
              <h2 id="mobile-progress" className="chance-landing-display-lg">
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

        <section ref={recordRef.ref} className="chance-landing-panel chance-landing-panel--record" aria-labelledby="mobile-record">
          <div className="chance-landing-panel-inner">
            <p className="chance-landing-eyebrow">Platform record</p>
            <h2 id="mobile-record" className="chance-landing-display-md">
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

        <section className="chance-landing-panel chance-landing-panel--final" aria-labelledby="mobile-final-cta">
          <div className="chance-landing-panel-inner chance-landing-final-inner">
            <p className="chance-landing-eyebrow">Your move</p>
            <h2 id="mobile-final-cta" className="chance-landing-display-xl">
              Prove it.
            </h2>
            <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-pressable chance-landing-cta-lg mt-12 w-full justify-center sm:w-auto">
              Enter the arena
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
