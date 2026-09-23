import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import CompetitiveShell from "@/components/app/competitive-shell"
import WalletPageClient from "@/components/wallet/wallet-page-client"
import StripeCheckoutSuccess from "@/components/wallet/stripe-checkout-success"
import { ChanceText } from "@/components/design-system/typography"
import { Gamepad2 } from "lucide-react"

function WalletPlayRail() {
  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <p className="chance-home-aligned-header chance-text-label text-[var(--chance-muted-fg)]">Next up</p>
      <p className="mt-2 text-sm font-medium leading-snug">Jump back into queue with your current stack.</p>
      <Link
        href="/games"
        className="chance-hero-cta-primary chance-focus-ring chance-pressable mt-4 flex w-full items-center justify-center gap-2 py-2.5 text-sm"
      >
        <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
        Find a match
      </Link>
    </div>
  )
}

export default async function WalletPage() {
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

  const { data: transactions = [] } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const rail = <WalletPlayRail />

  return (
    <CompetitiveShell user={user} rail={rail}>
      <Suspense fallback={null}>
        <StripeCheckoutSuccess />
      </Suspense>
      <WalletPageClient userId={user.id} initialTokens={user.tokens ?? 0} transactions={transactions} />
    </CompetitiveShell>
  )
}
