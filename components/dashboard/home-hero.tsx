import Image from "next/image"
import Link from "next/link"
import { Flame } from "lucide-react"
import SocialProofStrip from "@/components/dashboard/social-proof-strip"
import UserRank from "@/components/dashboard/user-rank"

type HomeHeroProps = {
  displayName: string
  wins: number
  losses: number
}

export default function HomeHero({ displayName, wins, losses }: HomeHeroProps) {
  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null
  const streakLabel = wins >= 3 ? `${Math.min(wins, 9)}+ wins` : wins > 0 ? "On the board" : "First match awaits"

  return (
    <section className="chance-hero-cinematic" aria-labelledby="home-hero-heading">
      <Image
        src="/chanceus-eagle.png"
        alt=""
        width={480}
        height={480}
        className="chance-hero-art object-contain object-bottom"
        priority
      />

      <div className="chance-streak-float">
        <div className="chance-streak-icon-wrap">
          <Flame className="size-5 stroke-[1.75]" aria-hidden />
        </div>
        <div className="chance-streak-float-copy min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{streakLabel}</p>
          <p className="chance-streak-float-meta chance-text-caption mt-0.5">
            Rank <UserRank />
            {winRate !== null ? ` · ${winRate}% wins` : ""}
          </p>
        </div>
      </div>

      <div className="chance-hero-content">
        <header className="chance-hero-identity">
          <h1 className="chance-home-aligned-header chance-home-welcome-header">
            Welcome <span>{displayName}</span>
          </h1>
        </header>

        <div className="chance-hero-main max-w-xl">
          <p className="chance-hero-kicker">
            <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
            Ranked skill
          </p>
          <h2 id="home-hero-heading" className="chance-hero-title">
            Prove it.
            <br />
            Win it.
          </h2>
          <p className="mt-3 max-w-md text-[0.9375rem] leading-[1.55] tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            Stake tokens, outplay opponents, and climb the ladder. No house edge — just head-to-head skill.
          </p>
          <SocialProofStrip />
          <div className="chance-hero-cta-row">
            <Link href="/games" className="chance-hero-cta-primary chance-focus-ring chance-pressable">
              Find a match
            </Link>
            <Link href="/games" className="chance-hero-cta-ghost chance-focus-ring">
              Browse lobbies
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
