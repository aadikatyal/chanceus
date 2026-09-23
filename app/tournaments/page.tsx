import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import CompetitionHero, { CompetitionHeroLink } from "@/components/competition/competition-hero"
import CompetitionTournamentArenaCard from "@/components/competition/competition-tournament-arena-card"
import { getAllTournaments } from "@/lib/tournament-actions"
import { Trophy } from "lucide-react"
import Link from "next/link"
import TournamentPasswordGate from "@/components/tournaments/tournament-password-gate"
import { ChanceText } from "@/components/design-system/typography"

export default async function TournamentsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] px-4">
        <ChanceText as="h1" variant="h2">
          Connect Supabase to get started
        </ChanceText>
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

  const tournaments = await getAllTournaments()

  return (
    <CompetitiveShell user={user}>
      <CompetitivePageFeed className="chance-competition-feed">
        <TournamentPasswordGate>
          <CompetitionHero
            kicker="Competition"
            title="Tournaments"
            subtitle="Bracket arenas for reputation spikes — register, climb rounds, take the pool."
            stats={[
              { label: "open arenas", value: tournaments.filter((t) => t.status !== "completed").length, mono: true },
              { label: "live brackets", value: tournaments.filter((t) => t.status === "in_progress").length, mono: true },
            ]}
            actions={
              <>
                <CompetitionHeroLink href="/leaderboards">Ladder</CompetitionHeroLink>
                <CompetitionHeroLink href="/tournaments/create" primary>
                  Host arena
                </CompetitionHeroLink>
              </>
            }
          />

          {tournaments.length === 0 ? (
            <section className="chance-premium-card py-12 text-center">
              <Trophy className="mx-auto mb-4 size-12 stroke-[1.5] text-[var(--chance-muted-fg)] opacity-60" aria-hidden />
              <h3 className="text-lg font-semibold">No arenas live</h3>
              <p className="chance-text-caption mt-1 mb-6">Open the first bracket and set the tone.</p>
              <Link href="/tournaments/create" className="chance-hero-cta-primary chance-focus-ring inline-flex px-4 py-2.5 text-sm">
                Create tournament
              </Link>
            </section>
          ) : (
            <div className="chance-competition-arena-grid">
              {tournaments.map((tournament) => (
                <CompetitionTournamentArenaCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TournamentPasswordGate>
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}

