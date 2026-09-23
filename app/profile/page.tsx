import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import CompetitionHero, { CompetitionHeroLink } from "@/components/competition/competition-hero"
import CompetitionRankSpotlight from "@/components/competition/competition-rank-spotlight"
import CompetitionAchievementWall from "@/components/competition/competition-achievement-wall"
import CompetitionMatchTimeline from "@/components/competition/competition-match-timeline"
import { ChanceText } from "@/components/design-system/typography"
import { Settings, Gamepad2 } from "lucide-react"

export default async function ProfilePage() {
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

  if (!authUser) redirect("/auth/login")

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()
  if (!user) redirect("/auth/login")

  const { data: recentMatches = [] } = await supabase
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
    .limit(12)

  const completed = recentMatches.filter((m) => m.status === "completed")
  const winStreak = completed.reduce((streak, match, index) => {
    if (match.winner_id === authUser.id) return index === 0 ? streak + 1 : streak
    return 0
  }, 0)

  const displayName = user.display_name || user.username

  const achievements = [
    { id: "first", title: "First blood", description: "Win your opening ranked match", unlocked: user.total_games_won >= 1, tier: "bronze" as const },
    { id: "ten", title: "Rising star", description: "10 career victories", unlocked: user.total_games_won >= 10, tier: "silver" as const },
    { id: "streak", title: "On fire", description: "3+ win streak", unlocked: winStreak >= 3, tier: "gold" as const },
    { id: "tokens", title: "Stacked", description: "Hold 1,000+ tokens", unlocked: user.tokens >= 1000, tier: "silver" as const },
    { id: "volume", title: "Grinder", description: "50 matches played", unlocked: user.total_games_played >= 50, tier: "gold" as const },
  ]

  return (
    <CompetitiveShell user={user}>
      <CompetitivePageFeed className="chance-competition-feed">
        <CompetitionHero
          kicker="Competition"
          title={displayName}
          subtitle={`@${user.username} — reputation earned in public matches.`}
          stats={[
            { label: "win rate", value: `${user.win_rate}%`, mono: true },
            { label: "wins", value: user.total_games_won, mono: true },
            { label: "member since", value: new Date(user.created_at).getFullYear(), mono: true },
          ]}
          actions={
            <>
              <Link
                href="/settings"
                className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Settings className="size-4 stroke-[1.75]" aria-hidden />
                Edit profile
              </Link>
              <CompetitionHeroLink href="/games" primary>
                <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
                Play ranked
              </CompetitionHeroLink>
            </>
          }
        />

        <div className="chance-competition-profile-grid">
          <div className="chance-competition-profile-main space-y-6">
            <CompetitionRankSpotlight
              displayName={displayName}
              rank={null}
              winRate={user.win_rate}
              totalWins={user.total_games_won}
              streak={winStreak}
            />
            <CompetitionMatchTimeline
              matches={recentMatches as any}
              currentUserId={authUser.id}
              title="Recent battles"
            />
          </div>
          <aside className="chance-competition-profile-aside">
            <CompetitionAchievementWall items={achievements} />
            <section className="chance-premium-card p-4 sm:p-[1.125rem]">
              <h2 className="chance-section-title text-base">Compete elsewhere</h2>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/rankings" className="chance-hero-cta-ghost chance-focus-ring px-3 py-2 text-center text-xs">
                  Rankings
                </Link>
                <Link href="/leaderboards" className="chance-hero-cta-ghost chance-focus-ring px-3 py-2 text-center text-xs">
                  Leaderboards
                </Link>
                <Link href="/tournaments" className="chance-hero-cta-ghost chance-focus-ring px-3 py-2 text-center text-xs">
                  Tournaments
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
