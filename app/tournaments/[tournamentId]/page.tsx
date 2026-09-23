import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CompetitiveShell from "@/components/app/competitive-shell"
import CompetitivePageFeed from "@/components/app/competitive-page-feed"
import CompetitionTournamentHero from "@/components/competition/competition-tournament-hero"
import {
  getTournament,
  getTournamentParticipants,
  getTournamentMatches,
} from "@/lib/tournament-actions"
import TournamentDetailClient from "@/components/tournaments/tournament-detail-client"
import { ChanceText } from "@/components/design-system/typography"
import Link from "next/link"

interface TournamentPageProps {
  params: Promise<{ tournamentId: string }>
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { tournamentId } = await params

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

  if (!authUser) redirect("/auth/login")

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()
  if (!user) redirect("/auth/login")

  const tournament = await getTournament(tournamentId)
  if (!tournament) {
    return (
      <CompetitiveShell user={user}>
        <CompetitivePageFeed className="chance-competition-feed">
          <section className="chance-premium-card py-16 text-center">
            <h1 className="chance-hero-title text-2xl">Arena not found</h1>
            <p className="chance-text-caption mt-2">This bracket may have been removed.</p>
            <Link href="/tournaments" className="chance-hero-cta-primary chance-focus-ring mt-6 inline-flex px-4 py-2.5 text-sm">
              Back to tournaments
            </Link>
          </section>
        </CompetitivePageFeed>
      </CompetitiveShell>
    )
  }

  const participants = await getTournamentParticipants(tournamentId)
  const matches = await getTournamentMatches(tournamentId)
  const isRegistered = participants.some((p) => p.user_id === user.id)

  return (
    <CompetitiveShell user={user}>
      <CompetitivePageFeed className="chance-competition-feed">
        <CompetitionTournamentHero tournament={tournament} participantCount={participants.length} />

        <div className="chance-competition-tournament-stats">
          {[
            { label: "Entry", value: `${tournament.entry_fee} tokens` },
            {
              label: "Round",
              value:
                tournament.current_round === 0
                  ? "Registration"
                  : `${tournament.current_round} / ${tournament.total_rounds}`,
            },
            { label: "Registered", value: `${participants.length} / ${tournament.max_participants}` },
            { label: "Prize pool", value: tournament.prize_pool.toLocaleString(), accent: true },
          ].map((s) => (
            <div key={s.label} className="chance-competition-tournament-stat chance-premium-card p-3 sm:p-4">
              <p className="chance-text-caption">{s.label}</p>
              <p
                className={`chance-text-mono mt-1 text-lg font-semibold tabular-nums ${
                  s.accent ? "text-[var(--chance-brand)]" : ""
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="chance-competition-tournament-detail">
          <TournamentDetailClient
            tournament={tournament}
            participants={participants}
            matches={matches}
            currentUser={user}
            isRegistered={isRegistered}
          />
        </div>
      </CompetitivePageFeed>
    </CompetitiveShell>
  )
}
