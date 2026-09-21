import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, Zap, Users, Calculator, Grid3X3, Brain, Shield, Clock, Coins, ArrowRight, CheckCircle2, Gamepad2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/navigation/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const games = [
  {
    id: "d0c5fda9-ec91-46b4-be62-cba48b398168",
    name: "Math Blitz",
    description: "Lightning-fast arithmetic challenges. Solve math problems quickly to win!",
    thumbnail: "/math-blitz.JPG",
    minBet: 10,
    maxBet: 500,
    icon: Calculator,
    color: "from-cyan-500 to-cyan-600",
  },
  {
    id: "69bf26d2-110b-40d9-b20a-d5cfab14d133",
    name: "Four in a Row",
    description: "Classic strategy game. Get four in a row to win!",
    thumbnail: "/4-in-a-row.JPG",
    minBet: 25,
    maxBet: 1000,
    icon: Grid3X3,
    color: "from-yellow-500 to-yellow-600",
  },
  {
    id: "e03ee060-b913-4795-9149-54660e2e2eac",
    name: "Trivia Challenge",
    description: "Test your knowledge across various categories!",
    thumbnail: "/trivia-blitz.JPG",
    minBet: 15,
    maxBet: 750,
    icon: Brain,
    color: "from-purple-500 to-purple-600",
  },
]

export default async function Home() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <h1 className="text-2xl font-bold text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Get user data directly from server client
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  let user = null
  if (authUser) {
    // Try to get complete user data from users table
    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single()
    
    if (userProfile) {
      user = userProfile
    } else {
      // Create fallback user object
      user = {
        id: authUser.id,
        username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
        email: authUser.email || '',
        display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        avatar_url: authUser.user_metadata?.avatar_url || null,
        tokens: 1000,
        total_games_played: 0,
        total_games_won: 0,
        win_rate: 0,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at || authUser.created_at
      }
    }
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="flex justify-center mb-8 animate-fade-in">
              <Image
                src="/chanceus-eagle.png"
                alt="ChanceUS Logo"
                width={600}
                height={180}
                className="h-40 sm:h-48 w-auto drop-shadow-2xl"
                priority
              />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="text-white">Skill-Based Gaming</span>
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Where Talent Wins
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Challenge friends in fast, skill-based games. No luck, no gimmicks—just pure talent and strategy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-6 text-lg font-semibold shadow-lg shadow-orange-500/50"
              >
                <Link href="/auth/sign-up" className="flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-gray-600 text-white hover:bg-white hover:text-gray-950 px-8 py-6 text-lg font-semibold bg-gray-900/50 backdrop-blur-sm"
              >
                <Link href="#games">Explore Games</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Games Showcase Section */}
      <section id="games" className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">Choose Your</span>{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Challenge
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Three unique games, one goal: prove you're the best
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {games.map((game) => {
              const IconComponent = game.icon
              return (
                <Card
                  key={game.id}
                  className="group bg-gray-900/80 border-gray-800 hover:border-orange-500/50 transition-all duration-300 overflow-hidden relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <CardHeader className="text-center pb-4 relative z-10">
                    <div className="flex justify-center mb-4">
                      <div className="relative w-40 h-40 rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-lg">
                        <Image
                          src={game.thumbnail}
                          alt={game.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 160px, 160px"
                        />
                      </div>
                    </div>
                    <div className="flex justify-center mb-2">
                      <div className={`p-3 bg-gradient-to-r ${game.color} rounded-lg`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-white text-2xl mb-2">{game.name}</CardTitle>
                    <CardDescription className="text-gray-400 text-base">{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Min Bet</span>
                      <span className="text-orange-500 font-semibold">{game.minBet} tokens</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Max Bet</span>
                      <span className="text-orange-500 font-semibold">{game.maxBet} tokens</span>
                    </div>
                    <Button
                      asChild
                      className={`w-full bg-gradient-to-r ${game.color} hover:opacity-90 text-white font-semibold`}
                    >
                      <Link href={`/games/${game.id}`}>
                        Play Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">Why Choose</span>{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                ChanceUS
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for competitive players who value skill over luck
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-white text-xl font-semibold mb-2">Lightning Fast</CardTitle>
                <CardDescription className="text-gray-300">
                  Quick matchmaking and instant gameplay. No waiting, just pure competitive action.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-purple-600/20 to-purple-700/10 border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-white text-xl font-semibold mb-2">100% Skill-Based</CardTitle>
                <CardDescription className="text-gray-300">
                  No random chance, no pay-to-win. Your talent and strategy determine the outcome.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/10 border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-white text-xl font-semibold mb-2">Play with Friends</CardTitle>
                <CardDescription className="text-gray-300">
                  Challenge your friends directly or compete in tournaments with players worldwide.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">How It</span>{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-orange-500/50 via-orange-500 to-orange-500/50"></div>
            
            {[
              { step: 1, title: "Choose Your Game", description: "Pick from Math Blitz, Four in a Row, or Trivia Challenge. Set your bet amount.", icon: Gamepad2 },
              { step: 2, title: "Get Matched", description: "Find an opponent instantly or challenge a friend directly.", icon: Users },
              { step: 3, title: "Play & Win", description: "Show your skills. Winner takes all the tokens!", icon: Trophy },
            ].map((item, index) => {
              const IconComponent = item.icon
              return (
                <div key={item.step} className="relative">
                  <Card className="bg-gray-900/80 border-gray-800 text-center h-full">
                    <CardHeader>
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur-xl opacity-50"></div>
                          <div className="relative p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full">
                            <IconComponent className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center mb-2">
                        <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-sm font-semibold">
                          Step {item.step}
                        </span>
                      </div>
                      <CardTitle className="text-white text-xl font-semibold mb-2">{item.title}</CardTitle>
                      <CardDescription className="text-gray-400">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Active Players", value: "10K+", icon: Users },
              { label: "Games Played", value: "50K+", icon: Trophy },
              { label: "Avg Match Time", value: "< 5 min", icon: Clock },
              { label: "Tokens Won", value: "1M+", icon: Coins },
            ].map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <IconComponent className="h-6 w-6 text-orange-500" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm sm:text-base text-gray-400">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-orange-500/30 rounded-2xl p-12 shadow-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-white">Ready to</span>{" "}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Start Playing?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of players competing in skill-based matches. Sign up free and get started in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-6 text-lg font-semibold shadow-lg shadow-orange-500/50"
              >
                <Link href="/auth/sign-up" className="flex items-center gap-2">
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-gray-600 text-white hover:bg-white hover:text-gray-950 px-10 py-6 text-lg font-semibold bg-gray-900/50"
              >
                <Link href="/games">Browse All Games</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
