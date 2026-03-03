import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/navigation/header"
import StatsCard from "@/components/dashboard/stats-card"
import QuickActions from "@/components/dashboard/quick-actions"
import RecentMatches from "@/components/dashboard/recent-matches"
import OnlineUsersCount from "@/components/dashboard/online-users-count"
import DashboardClient from "@/components/dashboard/dashboard-client"
import FriendsOnline from "@/components/dashboard/friends-online"
import WinningList from "@/components/dashboard/winning-list"
import UserRank from "@/components/dashboard/user-rank"
import { handleAuthError } from "@/lib/auth-fix"
import { Wallet, Trophy, Users, TrendingUp } from "lucide-react"
import Image from "next/image"

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
          <p className="text-gray-400">Configure your database connection to continue</p>
        </div>
      </div>
    )
  }

  // Get the user from the server
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!authUser) {
    redirect("/auth/login")
  }

  // Get user profile data
  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />
      <DashboardClient />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8 fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <Image src="/chanceus-eagle.png" alt="ChanceUS" width={60} height={60} className="h-12 w-12 flex-shrink-0" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white whitespace-nowrap">
                  Welcome back, <span className="text-accent">{user.display_name || user.username}</span>!
                </h1>
              </div>
              <p className="text-gray-400 mb-3 md:mb-0">Ready to challenge your friends in skill-based games?</p>
            </div>
            <div className="flex items-center md:ml-4">
              <FriendsOnline />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Token Balance"
            value={user.tokens?.toLocaleString() || "0"}
            description="Available for betting"
            icon={Wallet}
          />

          <StatsCard
            title="Games Won"
            value={user.total_games_won || 0}
            description="Victories achieved"
            icon={Trophy}
          />

          <StatsCard
            title="Users Online"
            value={<OnlineUsersCount />}
            description="Currently playing"
            icon={Users}
          />

          <StatsCard
            title="Rank"
            value={<UserRank />}
            description="Global leaderboard"
            icon={TrendingUp}
          />
        </div>

        <div className="mb-8">
          <QuickActions />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentMatches />
          </div>

          <div className="space-y-6">
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Recent Winners</h3>
                <div className="flex items-center text-green-500">
                  <Trophy className="w-4 h-4 mr-2" />
                  <span className="text-sm">Live Payouts</span>
                </div>
              </div>
              <WinningList />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
