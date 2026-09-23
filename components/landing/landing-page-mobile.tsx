"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import LandingFooter from "@/components/landing/landing-footer"
import LandingLiveArena from "@/components/landing/landing-live-arena"
import LandingPhoneMockup from "@/components/landing/landing-phone-mockup"
import { useCountUp } from "@/components/landing/use-count-up"
import { onLandingHashClick, scrollToLandingSection } from "@/components/landing/landing-scroll"
import type { LandingGame } from "@/components/landing/landing-page-client"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"
import { LANDING_SHOWCASE_LABELS, type LandingLiveMetrics } from "@/lib/landing-live-metrics"

const HOW_IT_WORKS = [
  { title: "Choose game", line: "Pick the mode where your skill shows." },
  { title: "Queue", line: "Real opponents. Real stakes." },
  { title: "Match", line: "Head-to-head — no house edge." },
  { title: "Win", line: "Take the pot. Climb the ladder." },
]

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

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reveal = () => setVisible(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) reveal()
      },
      { threshold: 0.05 }
    )
    io.observe(el)
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) reveal()
    })
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}

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

  const gameList = (games ?? []).length > 0 ? games : []
  const stepsReveal = useReveal()
  const rankReveal = useReveal()
  const communityReveal = useReveal()

  return (
    <div className="chance-landing-mobile-root">
      <main className="chance-landing-mobile-main">
        <section className="chance-landing-mobile-hero" aria-labelledby="mobile-hero-title">
          <div className="chance-landing-mobile-shell">
            <Image
              src="/chanceus-eagle.png"
              alt=""
              width={72}
              height={72}
              className="chance-landing-mobile-eagle"
              priority
            />
            <p className="chance-landing-mobile-kicker">Skill-based gaming</p>
            <h1 id="mobile-hero-title" className="chance-landing-mobile-headline">
              <span className="block">Play.</span>
              <span className="block">Compete.</span>
              <span className="chance-landing-mobile-headline-accent">Win.</span>
            </h1>
            <p className="chance-landing-mobile-lede">Outcomes follow skill—not luck. Every match builds your rank.</p>
            <div className="chance-landing-mobile-cta-stack">
              <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-landing-mobile-btn">
                Start playing
              </Link>
              <a
                href="#games"
                className="chance-hero-cta-ghost chance-focus-ring chance-landing-mobile-btn"
                onClick={(e) => onLandingHashClick(e, "#games")}
              >
                Browse games
              </a>
            </div>
            <div className="chance-landing-mobile-live-wrap">
              <LandingLiveArena live={live} variant="strip" />
            </div>
            <LandingPhoneMockup
              live={{ playersOnline: live.playersOnline, matchesLive: live.matchesLive, inQueue: live.inQueue }}
              priority
            />
          </div>
        </section>

        <section
          id="story"
          ref={stepsReveal.ref}
          className={`chance-landing-mobile-section ${stepsReveal.visible ? "is-visible" : ""}`}
          aria-labelledby="mobile-how-title"
        >
          <div className="chance-landing-mobile-shell">
            <p className="chance-landing-mobile-eyebrow">How it works</p>
            <h2 id="mobile-how-title" className="chance-landing-mobile-title">
              Four steps to the pot.
            </h2>
            <ol className="chance-landing-mobile-steps">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title}>
                  <span className="chance-landing-mobile-step-num" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <p className="chance-landing-mobile-step-title">{step.title}</p>
                    <p className="chance-landing-mobile-step-line">{step.line}</p>
                  </div>
                  {i < HOW_IT_WORKS.length - 1 ? <span className="chance-landing-mobile-step-connector" aria-hidden /> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="games" className="chance-landing-mobile-section" aria-labelledby="mobile-games-title">
          <div className="chance-landing-mobile-shell">
            <p className="chance-landing-mobile-eyebrow">Games</p>
            <h2 id="mobile-games-title" className="chance-landing-mobile-title">
              Pick your battlefield.
            </h2>
            <ul className="chance-landing-mobile-games">
              {gameList.map((game) => {
                const name = getGameDisplayName(game.name)
                const thumb = getGameThumbnail(game.name)
                return (
                  <li key={game.id} className="chance-landing-mobile-game-card">
                    <div className="chance-landing-mobile-game-art">
                      <Image src={thumb} alt="" fill className="object-cover" sizes="(max-width:480px) 92vw" loading="lazy" />
                    </div>
                    <div className="chance-landing-mobile-game-body">
                      <h3 className="chance-landing-mobile-game-name">{name}</h3>
                      <p className="chance-landing-mobile-game-desc">
                        {game.description ?? "Outplay them. Leave with the tokens."}
                      </p>
                      <p className="chance-landing-mobile-game-stakes chance-text-mono">
                        {game.min_bet}–{game.max_bet} tokens
                      </p>
                      <Link href={`/games/${game.id}`} className="chance-hero-cta-primary chance-focus-ring chance-landing-mobile-btn">
                        Enter queue
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section
          ref={rankReveal.ref}
          className={`chance-landing-mobile-section chance-landing-mobile-feature ${rankReveal.visible ? "is-visible" : ""}`}
          aria-labelledby="mobile-rank-title"
        >
          <div className="chance-landing-mobile-shell">
            <div className="chance-landing-mobile-feature-media">
              <LandingPhoneMockup live={{ playersOnline: live.playersOnline, matchesLive: live.matchesLive, inQueue: live.inQueue }} priority={false} />
            </div>
            <div className="chance-landing-mobile-feature-copy">
              <p className="chance-landing-mobile-eyebrow">Progression</p>
              <h2 id="mobile-rank-title" className="chance-landing-mobile-title">
                Your rank remembers.
              </h2>
              <p className="chance-landing-mobile-body">
                Streaks, match history, and seasonal ladders — a profile that reads like a career.
              </p>
            </div>
          </div>
        </section>

        <section
          id="community"
          ref={communityReveal.ref}
          className={`chance-landing-mobile-section chance-landing-mobile-feature chance-landing-mobile-feature--flip ${communityReveal.visible ? "is-visible" : ""}`}
          aria-labelledby="mobile-community-title"
        >
          <div className="chance-landing-mobile-shell">
            <div className="chance-landing-mobile-feature-copy">
              <p className="chance-landing-mobile-eyebrow">Community</p>
              <h2 id="mobile-community-title" className="chance-landing-mobile-title">
                The arena never sleeps.
              </h2>
              <p className="chance-landing-mobile-body">
                Friends online, tables running, leaderboards moving while you queue.
              </p>
            </div>
            <div className="chance-landing-mobile-feature-media chance-landing-mobile-feature-media--panel">
              <LandingLiveArena live={live} variant="grid" />
              <ul className="chance-landing-mobile-tags" aria-label="Community surfaces">
                {["Friends", "Spectate", "Rankings", "Voice"].map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="tournaments"
          className="chance-landing-mobile-section chance-landing-mobile-feature"
          aria-labelledby="mobile-tournaments-title"
        >
          <div className="chance-landing-mobile-shell">
            <div className="chance-landing-mobile-feature-media chance-landing-mobile-bracket-card" aria-hidden>
              <span className="chance-landing-mobile-bracket-label">Bracket</span>
              <span className="chance-landing-mobile-bracket-pot">Winner take all</span>
            </div>
            <div className="chance-landing-mobile-feature-copy">
              <p className="chance-landing-mobile-eyebrow">
                {live.tournamentsLive > 0 ? `${live.tournamentsLive} live now` : "Tournaments"}
              </p>
              <h2 id="mobile-tournaments-title" className="chance-landing-mobile-title">
                Run the bracket.
              </h2>
              <p className="chance-landing-mobile-body">
                Open brackets, token prizes, and a stage when head-to-head isn&apos;t enough.
              </p>
              <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-landing-mobile-btn mt-8">
                Join a bracket
              </Link>
            </div>
          </div>
        </section>

        <section ref={recordRef.ref} className="chance-landing-mobile-section" aria-labelledby="mobile-record-title">
          <div className="chance-landing-mobile-shell">
            <p className="chance-landing-mobile-eyebrow">Platform record</p>
            <h2 id="mobile-record-title" className="chance-landing-mobile-title">
              Every match matters.
            </h2>
            <dl className="chance-landing-mobile-stats">
              <div>
                <dd className="chance-landing-mobile-stat-value" data-zero={live.gamesPlayed === 0 || undefined}>
                  {recordGames.toLocaleString()}
                </dd>
                <dt>{LANDING_SHOWCASE_LABELS.gamesPlayed}</dt>
              </div>
              <div>
                <dd className="chance-landing-mobile-stat-value" data-zero={live.tokensInPlay === 0 || undefined}>
                  {recordTokens.toLocaleString()}
                </dd>
                <dt>{LANDING_SHOWCASE_LABELS.tokensInPlay}</dt>
              </div>
              <div>
                <dd className="chance-landing-mobile-stat-value" data-zero={live.moneyMadeUsd === 0 || undefined}>
                  ${recordMoney.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
                <dt>{LANDING_SHOWCASE_LABELS.moneyMade}</dt>
              </div>
            </dl>
          </div>
        </section>

        <section className="chance-landing-mobile-section chance-landing-mobile-final" aria-labelledby="mobile-final-cta">
          <div className="chance-landing-mobile-shell chance-landing-mobile-shell--center">
            <p className="chance-landing-mobile-eyebrow">Your move</p>
            <h2 id="mobile-final-cta" className="chance-landing-mobile-headline chance-landing-mobile-headline--final">
              Prove it.
            </h2>
            <Link href="/auth/sign-up" className="chance-hero-cta-primary chance-focus-ring chance-landing-mobile-btn">
              Create free account
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
