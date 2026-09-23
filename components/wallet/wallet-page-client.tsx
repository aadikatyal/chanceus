"use client"

import Link from "next/link"
import { Coins, Gamepad2, Plus, ArrowUpFromLine } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Transaction } from "@/lib/supabase/client"
import BuyButtons from "@/app/wallet/BuyButtons"
import TransferTokensForm from "@/components/wallet/transfer-tokens-form"
import TransactionHistory from "@/components/wallet/transaction-history"

type WalletPageClientProps = {
  userId: string
  initialTokens: number
  transactions: Transaction[]
}

export default function WalletPageClient({ userId, initialTokens, transactions }: WalletPageClientProps) {
  const [tokens, setTokens] = useState(initialTokens)

  useEffect(() => {
    setTokens(initialTokens)
  }, [initialTokens])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`wallet-page-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as { tokens?: number }
          if (next.tokens !== undefined) setTokens(next.tokens)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="chance-home-feed mx-auto w-full max-w-none pb-10">
      <section className="chance-wallet-hero" aria-labelledby="wallet-balance-heading">
        <div className="chance-wallet-hero-glow" aria-hidden />
        <div className="chance-wallet-hero-inner">
          <p className="chance-hero-kicker">
            <Coins className="size-3 stroke-[1.75]" aria-hidden />
            Your stack
          </p>
          <h1 id="wallet-balance-heading" className="chance-wallet-hero-balance mt-3">
            {tokens.toLocaleString()}
            <span className="chance-wallet-hero-unit"> tokens</span>
          </h1>
          <p className="mt-3 max-w-md text-[0.9375rem] leading-[1.55] text-[var(--chance-muted-fg)]">
            Stake, win, and queue again. No friction between balance and the next match.
          </p>

          <div className="chance-hero-cta-row mt-6">
            <button
              type="button"
              className="chance-hero-cta-primary chance-focus-ring chance-pressable inline-flex items-center justify-center gap-2"
              onClick={() => scrollTo("wallet-add-tokens")}
            >
              <Plus className="size-4 stroke-[2]" aria-hidden />
              Add tokens
            </button>
            <button
              type="button"
              className="chance-secondary-btn chance-focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
              onClick={() => scrollTo("wallet-withdraw")}
            >
              <ArrowUpFromLine className="size-4 stroke-[1.75]" aria-hidden />
              Withdraw
            </button>
            <Link href="/games" className="chance-hero-cta-ghost chance-focus-ring inline-flex items-center gap-2">
              <Gamepad2 className="size-4 stroke-[1.75]" aria-hidden />
              Find a match
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-8">
        <section id="wallet-add-tokens" className="scroll-mt-24">
          <header className="mb-4">
            <h2 className="chance-section-title">Add tokens</h2>
            <p className="chance-text-caption mt-1">Secure checkout — tokens land in your stack instantly.</p>
          </header>
          <BuyButtons current={tokens} />
        </section>

        <section id="wallet-withdraw" className="scroll-mt-24">
          <header className="mb-4">
            <h2 className="chance-section-title">Withdraw</h2>
            <p className="chance-text-caption mt-1">Send tokens to another player by username.</p>
          </header>
          <TransferTokensForm userBalance={tokens} />
        </section>

        <section>
          <TransactionHistory transactions={transactions} />
        </section>
      </div>
    </div>
  )
}
