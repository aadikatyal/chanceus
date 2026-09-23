"use client"

import Link from "next/link"
import { Coins, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type WalletRailProps = {
  userId: string
  initialTokens: number
}

export default function WalletRail({ userId, initialTokens }: WalletRailProps) {
  const [tokens, setTokens] = useState(initialTokens)

  useEffect(() => {
    setTokens(initialTokens)
  }, [initialTokens])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`wallet-rail-${userId}`)
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

  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="chance-home-aligned-header chance-text-label text-[var(--chance-muted-fg)]">Wallet</p>
          <p className="chance-wallet-hero-balance chance-text-mono mt-2 flex items-center gap-2 text-[var(--chance-fg)]">
            <Coins className="size-[1.375rem] stroke-[1.75] text-[var(--chance-brand)] drop-shadow-[0_0_12px_color-mix(in_srgb,var(--chance-brand)_60%,transparent)]" aria-hidden />
            {tokens.toLocaleString()}
          </p>
          <p className="chance-text-caption mt-1">Available tokens</p>
        </div>
        <Link
          href="/wallet"
          className="chance-focus-ring chance-pressable inline-flex size-10 items-center justify-center rounded-[var(--chance-radius-md)] bg-[var(--chance-brand)] text-[var(--chance-brand-fg)] shadow-[0_4px_16px_color-mix(in_srgb,var(--chance-brand)_45%,transparent)] hover:scale-[1.04] active:scale-[0.96]"
          aria-label="Add tokens"
        >
          <Plus className="size-5 stroke-[2]" />
        </Link>
      </div>
      <div className="relative mt-5 flex gap-2">
        <Link href="/wallet" className="chance-hero-cta-primary chance-focus-ring chance-pressable flex-1 py-2.5 text-center text-sm">
          Add tokens
        </Link>
        <Link href="/wallet" className="chance-secondary-btn chance-focus-ring flex-1 px-3 py-2.5">
          Withdraw
        </Link>
      </div>
    </div>
  )
}
