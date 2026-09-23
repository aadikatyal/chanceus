import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Header from "@/components/navigation/header"
import MathBlitz from "@/components/games/math-blitz"
import ConnectFour from "@/components/games/connect-four"
import TriviaChallenge from "@/components/games/trivia-challenge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface GamePlayPageProps {
  params: {
    gameId: string
  }
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const resolvedParams = await params
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--chance-bg)] text-[var(--chance-fg)] chance-competitive-theme">
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

  // Get user profile data
  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  // Get game data
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", resolvedParams.gameId)
    .eq("is_active", true)
    .single()

  if (!game) {
    notFound()
  }

  const renderGame = () => {
    switch (game.name.toLowerCase()) {
      case "math blitz":
        return <MathBlitz />
      case "4 in a row":
      case "four in a row":
        return (
          <ConnectFour
            onGameEnd={(winner) => console.log("Game ended:", winner)}
            isActive={true}
            currentPlayer="player1"
            isMyTurn={true}
          />
        )
      case "trivia challenge":
        return <TriviaChallenge />
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Game Not Available</h2>
            <p className="text-gray-400">This game is not yet implemented for solo play.</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] chance-competitive-theme">
      <Header user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button asChild variant="outline" className="border-gray-700 text-gray-300 hover:text-white bg-transparent">
            <Link href={`/games/${resolvedParams.gameId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {game.name} Lobby
            </Link>
          </Button>
        </div>

        {/* Game Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Practice {game.name}
          </h1>
          <p className="text-gray-400 text-lg">
            Play solo to practice your skills before competing with others
          </p>
        </div>

        {/* Game Component */}
        <div className="flex justify-center">
          {renderGame()}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <div className="space-x-4">
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
              <Link href={`/games/${resolvedParams.gameId}?tier=free`}>
                Play for Real
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Link href={`/games/${resolvedParams.gameId}`}>
                Back to Lobby
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
