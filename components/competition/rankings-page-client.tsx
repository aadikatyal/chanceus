"use client"

import { useEffect, useState } from "react"
import { getLeaderboard, getUserStatistics } from "@/lib/analytics-actions"
import CompetitionHero, { CompetitionHeroLink } from "@/components/competition/competition-hero"
import CompetitionProgressMeter from "@/components/competition/competition-progress-meter"
import CompetitionRankSpotlight from "@/components/competition/competition-rank-spotlight"
import type { User } from "@/lib/supabase/client"
import { Flame, Target, Trophy, TrendingUp } from "lucide-react"
import Link from "next/link"

type RankingsPageClientProps = {
  user: User
  displayName: string
}

export default function RankingsPageClient({ user, displayName }: RankingsPageClientProps) {
  const [stats, setStats] = useState<any>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [ladderSize, setLadderSize] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [statsRes, ladderRes] = await Promise.all([
        getUserStatistics(user.id),
        getLeaderboard("overall"),
      ])
      if (!cancelled) {
        if (statsRes.data) setStats(statsRes.data)
        if (ladderRes.data) {
          setLadderSize(ladderRes.data.length)
          const idx = ladderRes.data.findIndex((e: { user_id: string }) => e.user_id === user.id)
          setRank(idx >= 0 ? idx + 1 : null)
        }
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  const streak = stats?.current_win_streak ?? 0
  const winRate = stats?.win_rate ?? user.win_rate ?? 0

  return (
    <>
      <CompetitionHero
        kicker="Competition"
        title="Rankings"
        subtitle="Your reputation is earned in public matches — track momentum before the next queue."
        stats={[
          { label: "global rank", value: rank ? `#${rank}` : "Unranked", mono: true },
          { label: "current streak", value: streak, mono: true },
          { label: "career wins", value: user.total_games_won ?? 0, mono: true },
        ]}
        actions={
          <>
            <CompetitionHeroLink href="/leaderboards">Full ladder</CompetitionHeroLink>
            <CompetitionHeroLink href="/games" primary>
              Play ranked
            </CompetitionHeroLink>
          </>
        }
      />

      {loading ? (
        <section className="chance-premium-card p-8 text-center">
          <p className="chance-text-caption">Loading your rank profile…</p>
        </section>
      ) : (
        <>
          <CompetitionRankSpotlight
            displayName={displayName}
            rank={rank}
            winRate={Number(winRate)}
            totalWins={user.total_games_won ?? 0}
            streak={streak}
            ladderSize={ladderSize}
          />
          <CompetitionProgressMeter
            title="Progress signals"
            metrics={[
              {
                id: "wr",
                label: "Win rate",
                value: `${Number(winRate).toFixed(1)}%`,
                hint: "Skill indicator",
                icon: Target,
                accent: "brand",
              },
              {
                id: "streak",
                label: "Win streak",
                value: streak,
                hint: `Best ${stats?.longest_win_streak ?? 0}`,
                icon: Flame,
                accent: "yes",
              },
              {
                id: "volume",
                label: "Matches played",
                value: stats?.total_matches ?? user.total_games_played ?? 0,
                hint: "Volume unlocks rank",
                icon: TrendingUp,
              },
              {
                id: "wins",
                label: "Total wins",
                value: stats?.total_wins ?? user.total_games_won ?? 0,
                hint: "Career victories",
                icon: Trophy,
                accent: "yes",
              },
            ]}
          />
          <section className="chance-premium-card p-4 sm:p-[1.125rem]">
            <p className="text-sm font-medium">Next step</p>
            <p className="chance-text-caption mt-1">
              Rankings update from ranked head-to-head results. Tournaments boost reputation separately.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/matches" className="chance-hero-cta-ghost chance-focus-ring px-3 py-2 text-xs">
                Activity timeline
              </Link>
              <Link href="/tournaments" className="chance-hero-cta-ghost chance-focus-ring px-3 py-2 text-xs">
                Tournaments
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  )
}
