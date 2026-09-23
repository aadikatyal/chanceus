import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import CompetitionHero, { CompetitionHeroLink } from "@/components/competition/competition-hero"
import CompetitionProgressMeter from "@/components/competition/competition-progress-meter"
import CompetitionMatchTimeline from "@/components/competition/competition-match-timeline"
import { ChanceText } from "@/components/design-system/typography"
import { Trophy, Target, TrendingUp, Clock, Flame, Gamepad2 } from "lucide-react"
import Link from "next/link"

export default async function MatchesPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <div className="max-w-md text-center">
          <ChanceText as="h1" variant="h2" className="mb-3">
            Connect Supabase to get started
          </ChanceText>
          <ChanceText variant="muted">Configure your database connection to continue</ChanceText>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: matches = [], error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      bet_amount,
      status,
      winner_id,
      started_at,
      completed_at,
      created_at,
      games (name),
      player1:users!matches_player1_id_fkey (id, username, display_name, avatar_url),
      player2:users!matches_player2_id_fkey (id, username, display_name, avatar_url)
    `)
    .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
    .order("created_at", { ascending: false })
    .limit(50)

  if (matchesError) {
    console.error("❌ Error fetching matches:", matchesError)
  }

  const completedMatches = matches.filter((m) => m.status === "completed")
  const totalWins = completedMatches.filter((m) => m.winner_id === authUser.id).length
  const totalLosses = completedMatches.filter((m) => m.winner_id && m.winner_id !== authUser.id).length
  const totalDraws = completedMatches.filter((m) => !m.winner_id).length

  const averageMatchDuration = completedMatches.length
    ? Math.round(
        completedMatches
          .filter((m) => m.started_at && m.completed_at)
          .reduce((sum, m) => {
            const duration = new Date(m.completed_at!).getTime() - new Date(m.started_at!).getTime()
            return sum + duration / 1000 / 60
          }, 0) / completedMatches.length,
      )
    : 0

  const recentStreak = completedMatches.slice(0, 10).reduce((streak, m) => {
    if (m.winner_id === authUser.id) return streak + 1
    return 0
  }, 0)

  return (
    <CompetitiveShell user={user}>
      <CompetitivePageFeed className="chance-competition-feed">
        <CompetitionHero
          kicker="Competition"
          title="Activity"
          subtitle="Every match is a step on your ladder — wins, losses, and rematches tell the story."
          stats={[
            { label: "win rate", value: `${user.win_rate}%`, mono: true },
            { label: "career wins", value: totalWins, mono: true },
            { label: "matches", value: user.total_games_played, mono: true },
          ]}
          actions={
            <>
              <CompetitionHeroLink href="/rankings">Your rank</CompetitionHeroLink>
              <CompetitionHeroLink href="/games" primary>
                <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
                Queue again
              </CompetitionHeroLink>
            </>
          }
        />

        <CompetitionProgressMeter
          metrics={[
            {
              id: "wins",
              label: "Victories",
              value: totalWins,
              hint: `${totalLosses} losses · ${totalDraws} draws`,
              icon: Trophy,
              accent: "yes",
            },
            {
              id: "wr",
              label: "Win rate",
              value: `${user.win_rate}%`,
              hint: "Ranked skill signal",
              icon: Target,
              accent: "brand",
            },
            {
              id: "volume",
              label: "Matches",
              value: user.total_games_played,
              hint: "Career volume",
              icon: TrendingUp,
            },
            {
              id: "pace",
              label: "Avg duration",
              value: `${averageMatchDuration}m`,
              hint: "Per completed match",
              icon: Clock,
            },
          ]}
        />

        <div className="chance-competition-activity-links">
          <Link href="/leaderboards" className="chance-link-arrow text-sm">
            Global ladder →
          </Link>
          <Link href="/tournaments" className="chance-link-arrow text-sm">
            Tournament arenas →
          </Link>
        </div>

        <CompetitionMatchTimeline matches={matches} currentUserId={authUser.id} />

        {recentStreak >= 2 ? (
          <section className="chance-competition-streak-banner chance-premium-card p-4 sm:p-5">
            <Flame className="size-5 text-[var(--chance-brand)]" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{recentStreak}-match hot streak</p>
              <p className="chance-text-caption">Keep pressure on — the ladder is watching.</p>
            </div>
            <CompetitionHeroLink href="/games" primary>
              Stay in queue
            </CompetitionHeroLink>
          </section>
        ) : null}
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
