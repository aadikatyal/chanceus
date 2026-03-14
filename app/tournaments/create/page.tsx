import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import CreateTournamentForm from "@/components/tournaments/create-tournament-form"
import TournamentPasswordGate from "@/components/tournaments/tournament-password-gate"

export default async function CreateTournamentPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
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

  // Get all active games
  const { data: games = [] } = await supabase
    .from("games")
    .select("*")
    .eq("is_active", true)
    .order("name")

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />

      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <TournamentPasswordGate>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Tournament</h1>
            <p className="text-gray-400">Power of 2 players (4, 8, 16, … 512). No byes.</p>
          </div>

          <CreateTournamentForm games={games} />
        </TournamentPasswordGate>
      </main>
    </div>
  )
}

