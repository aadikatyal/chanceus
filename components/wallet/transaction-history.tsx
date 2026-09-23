import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Coins, Gamepad2, Gift, Trophy } from "lucide-react"
import type { Transaction } from "@/lib/supabase/client"

interface TransactionHistoryProps {
  transactions: Transaction[]
}

type Meta = {
  label: string
  icon: ReactNode
  amountPositive: boolean
}

const TYPE_META: Record<string, Meta> = {
  buy: {
    label: "Purchase",
    icon: <Coins className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />,
    amountPositive: true,
  },
  transfer_in: {
    label: "Received",
    icon: <ArrowDownLeft className="size-4 stroke-[1.75] text-[var(--chance-yes)]" aria-hidden />,
    amountPositive: true,
  },
  transfer_out: {
    label: "Sent",
    icon: <ArrowRightLeft className="size-4 stroke-[1.75] text-[var(--chance-muted-fg)]" aria-hidden />,
    amountPositive: false,
  },
  win: {
    label: "Match win",
    icon: <Trophy className="size-4 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />,
    amountPositive: true,
  },
  bet: {
    label: "Match stake",
    icon: <Gamepad2 className="size-4 stroke-[1.75] text-[var(--chance-muted-fg)]" aria-hidden />,
    amountPositive: false,
  },
  bonus: {
    label: "Bonus",
    icon: <Gift className="size-4 stroke-[1.75] text-[var(--chance-yes)]" aria-hidden />,
    amountPositive: true,
  },
}

const fallbackMeta: Meta = {
  label: "Activity",
  icon: <ArrowUpRight className="size-4 stroke-[1.75] text-[var(--chance-muted-fg)]" aria-hidden />,
  amountPositive: true,
}

const STRIPE_PURCHASE_DESC_PREFIX = "Token purchase (Stripe session:"
const STRIPE_PI_DESC_PREFIX = "Token purchase (Stripe PaymentIntent:"

function deriveTitle(t: Transaction) {
  const raw = (t as { description?: string; note?: string }).description || (t as { note?: string }).note || ""
  const trimmed = raw.trim()

  if (t.type === "transfer_out") {
    const m = trimmed.match(/to\s+@?([\w.-]+)/i)
    if (m) return `To @${m[1]}`
    return "Sent tokens"
  }

  if (t.type === "transfer_in") {
    const m = trimmed.match(/from\s+@?([\w.-]+)/i)
    if (m) return `From @${m[1]}`
    return "Received tokens"
  }

  if (t.type === "buy") return "Token pack"
  if (
    t.type === "bonus" &&
    (trimmed.startsWith(STRIPE_PURCHASE_DESC_PREFIX) || trimmed.startsWith(STRIPE_PI_DESC_PREFIX))
  )
    return "Token pack"
  if (t.type === "win") return trimmed || "Match win"
  if (t.type === "bet") return trimmed || "Match stake"
  if (t.type === "bonus") return trimmed || "Bonus"
  return trimmed || "Transaction"
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="chance-section-title">Recent activity</h2>
          <p className="chance-text-caption mt-1">Wins, stakes, and top-ups</p>
        </div>
      </header>

      <div className="chance-premium-card overflow-hidden p-0">
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Trophy className="mx-auto size-10 stroke-[1.75] text-[var(--chance-muted-fg)] opacity-60" aria-hidden />
            <p className="mt-4 font-medium">No activity yet</p>
            <p className="chance-text-caption mt-1">Your first match will show up here.</p>
            <Link href="/games" className="chance-hero-cta-primary chance-focus-ring mt-6 inline-flex px-5 py-2.5 text-sm">
              Find a match
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--chance-border)]">
            {transactions.map((t) => {
              const desc = (t as { description?: string }).description || ""
              const isStripePurchase =
                t.type === "bonus" &&
                (desc.startsWith(STRIPE_PURCHASE_DESC_PREFIX) || desc.startsWith(STRIPE_PI_DESC_PREFIX))
              const meta = isStripePurchase ? TYPE_META.buy : TYPE_META[t.type] ?? fallbackMeta
              const title = deriveTitle(t)
              const positive = t.amount > 0
              const amountClass = positive ? "text-[var(--chance-yes)]" : "text-[var(--chance-fg)]"

              return (
                <li key={t.id} className="chance-wallet-tx-row flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--chance-border)] bg-[var(--chance-surface-inset)]"
                    aria-hidden
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    <p className="chance-text-caption mt-0.5">
                      {meta.label} · {fmtWhen(t.created_at)}
                    </p>
                  </div>
                  <p className={`chance-text-mono shrink-0 text-sm font-bold tabular-nums ${amountClass}`}>
                    {positive ? "+" : ""}
                    {t.amount.toLocaleString()}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
