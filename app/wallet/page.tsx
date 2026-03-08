import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import Header from "@/components/navigation/header"
import AddTokensForm from "@/components/wallet/add-tokens-form"
import TransactionHistory from "@/components/wallet/transaction-history"
import StripeCheckoutSuccess from "@/components/wallet/stripe-checkout-success"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import BuyButtons from './BuyButtons'

export default async function WalletPage() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
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

  // Get transaction history
  const { data: transactions = [] } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Calculate stats
  const totalEarned = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)

  const totalSpent = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header user={user} />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-transparent pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Wallet</h1>
          <p className="text-gray-400">Manage your tokens and view transaction history</p>
        </div>

        {/* Wallet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/80 border-yellow-500/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{user.tokens.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Available tokens</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-green-500/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Earned</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{totalEarned.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">From wins and bonuses</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-red-500/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Spent</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{totalSpent.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">From bets and transfers</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-cyan-500/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${totalEarned - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {totalEarned - totalSpent >= 0 ? "+" : ""}
                {(totalEarned - totalSpent).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Lifetime profit/loss</p>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Actions and History */}
        <Suspense fallback={null}>
          <StripeCheckoutSuccess />
        </Suspense>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Actions */}
          <div className="space-y-6">
            <BuyButtons current={user.tokens} />
          </div>

          {/* Right Column - Transaction History */}
          <div className="lg:col-span-2">
            <TransactionHistory transactions={transactions} />
          </div>
        </div>
      </main>
    </div>
  )
}
