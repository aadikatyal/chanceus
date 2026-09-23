"use client"

import { useEffect, useState } from "react"
import { getLeaderboard } from "@/lib/analytics-actions"
import CompetitionHero, { CompetitionHeroLink } from "@/components/competition/competition-hero"
import CompetitionLadder from "@/components/competition/competition-ladder"
import type { User } from "@/lib/supabase/client"
import { Gamepad2 } from "lucide-react"

type LeaderboardsPageClientProps = {
  user: User
}

export default function LeaderboardsPageClient({ user }: LeaderboardsPageClientProps) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getLeaderboard("overall")
      if (!cancelled && res.data) setEntries(res.data)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const myRank = entries.findIndex((e) => e.user_id === user.id) + 1

  return (
    <>
      <CompetitionHero
        kicker="Competition"
        title="Leaderboards"
        subtitle="The ladder never sleeps. Win rate and volume decide who sits at the top."
        stats={[
          { label: "your rank", value: myRank > 0 ? `#${myRank}` : "—", mono: true },
          { label: "rated players", value: entries.length || "—", mono: true },
          { label: "win rate", value: `${user.win_rate ?? 0}%`, mono: true },
        ]}
        actions={
          <CompetitionHeroLink href="/games" primary>
            <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
            Climb now
          </CompetitionHeroLink>
        }
      />
      {loading ? (
        <section className="chance-premium-card p-8 text-center">
          <p className="chance-text-caption">Syncing ladder…</p>
        </section>
      ) : (
        <CompetitionLadder entries={entries} currentUserId={user.id} limit={50} />
      )}
    </>
  )
}
