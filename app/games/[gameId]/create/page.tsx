import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import CreateMatchForm from "@/components/games/create-match-form"
import MathBlitz from "@/components/games/math-blitz"
import TriviaChallenge from "@/components/games/trivia-challenge"
import ConnectFourPreview from "@/components/games/connect-four-preview"

interface CreateMatchPageProps {
  params: {
    gameId: string
  }
}

export default async function CreateMatchPage({ params }: CreateMatchPageProps) {
  const resolvedParams = await params
  
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  const supabase = await createClient()
  
  // Test database connection
  console.log("🔍 Testing database connection...")
  const { data: testData, error: testError } = await supabase.from("games").select("count").limit(1)
  console.log("🔍 Database test result:", { testData, testError })
  
  if (testError) {
    console.error("❌ Database connection failed:", testError)
      return (
      <div className="min-h-screen bg-gray-950">
        <Header user={user} />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Database Connection Error</h1>
            <p className="text-gray-400 mb-4">Unable to connect to the database.</p>
            <p className="text-gray-400 mb-4">Error: {testError.message}</p>
            <a href="/games" className="text-blue-400 hover:text-blue-300">Back to Games</a>
          </div>
        </div>
      </div>
    )
  }
  
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

  // Get game details
  console.log("🔍 Looking for game with ID:", resolvedParams.gameId)
  console.log("🔍 Game ID type:", typeof resolvedParams.gameId)
  console.log("🔍 Game ID length:", resolvedParams.gameId?.length)
  
  let game: any = null
  
  try {
    const { data: gameData, error: gameError } = await supabase.from("games").select("*").eq("id", resolvedParams.gameId).single()
    
    console.log("🔍 Game query result:", { gameData, gameError })
    
    if (gameError) {
      console.error("❌ Error fetching game:", {
        code: gameError.code,
        message: gameError.message,
        details: gameError.details,
        hint: gameError.hint,
        fullError: gameError
      })
      
      // Let's see what games exist
      const { data: allGames, error: allGamesError } = await supabase.from("games").select("*")
      console.log("🔍 All games in database:", { allGames, allGamesError })
      
      redirect("/games")
    }
    
    if (!gameData) {
      console.error("❌ Game not found with ID:", resolvedParams.gameId)
      
      // Let's see what games exist
      const { data: allGames } = await supabase.from("games").select("*")
      console.log("🔍 All games in database:", allGames)
      
      redirect("/games")
    }
    
    game = gameData
    console.log("✅ Found game:", game)
  } catch (err) {
    console.error("❌ Exception during game fetch:", err)
    redirect("/games")
  }

  return (
    <div className="min-h-screen h-full bg-gray-950 relative">
      {/* Subtle gradient overlay */}
      
      
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create {game.name} Match</h1>
          <p className="text-gray-400">Set your bet and challenge other players</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Match Creation Form */}
          <div>
            <CreateMatchForm game={game} user={user} />
          </div>

          {/* Game Preview */}
          <div>
            <div className="bg-gray-900/50 border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Game Preview</h2>
              <p className="text-gray-400 mb-6">
                This is what you'll be playing. Practice while waiting for an opponent!
              </p>
              
              {/* Show Math Blitz for Math Blitz game */}
              {game.name === "Math Blitz" && (
                <div className="scale-90 origin-top">
                  <MathBlitz />
                </div>
              )}
              
              {/* Show Connect 4 for 4 In a Row game - check multiple name variations */}
              {(() => {
                const gameNameLower = game.name?.toLowerCase() || ""
                const isConnect4 = gameNameLower.includes("row") || 
                                  gameNameLower.includes("connect") ||
                                  game.name === "4 In a Row" ||
                                  game.name === "Four in a Row" ||
                                  game.name === "Connect 4"
                
                return isConnect4 ? (
                  <div className="scale-90 origin-top">
                    <ConnectFourPreview />
                  </div>
                ) : null
              })()}
              
              {game.name === "Trivia Challenge" && (
                <div className="scale-90 origin-top">
                  <TriviaChallenge />
                </div>
              )}
              
              {/* Debug: Show game name if no preview matches */}
              {game.name !== "Math Blitz" && 
               game.name !== "Trivia Challenge" && 
               !(game.name?.toLowerCase().includes("row") || 
                 game.name?.toLowerCase().includes("connect")) && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-white text-lg font-semibold">{game.name}</h3>
                  <p className="text-gray-400">Game preview for: {game.name}</p>
                  <p className="text-gray-500 text-xs mt-2">Name check: {JSON.stringify(game.name)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
