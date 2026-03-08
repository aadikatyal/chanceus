import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownLeft, Trophy, Gift, Coins, Download, ArrowRightLeft } from "lucide-react"
import type { Transaction } from "@/lib/supabase/client"

interface TransactionHistoryProps {
  transactions: Transaction[]
}

type Meta = {
  label: string
  short: string
  badgeClass: string
  icon: JSX.Element
  amountClass?: string
}

const TYPE_META: Record<string, Meta> = {
  buy: {
    label: "Token pack purchase",
    short: "buy",
    badgeClass: "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300",
    icon: <Coins className="h-4 w-4 text-yellow-300" />,
    amountClass: "text-emerald-400",
  },
  transfer_in: {
    label: "Received tokens",
    short: "in",
    badgeClass: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300",
    icon: <ArrowDownLeft className="h-4 w-4 text-emerald-300 rotate-180" />,
    amountClass: "text-emerald-400",
  },
  transfer_out: {
    label: "Sent tokens",
    short: "out",
    badgeClass: "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300",
    icon: <ArrowRightLeft className="h-4 w-4 text-cyan-300" />,
    amountClass: "text-red-400",
  },
  win: {
    label: "Game win",
    short: "win",
    badgeClass: "bg-purple-500/10 border border-purple-500/20 text-purple-300",
    icon: <Trophy className="h-4 w-4 text-purple-300" />,
    amountClass: "text-emerald-400",
  },
  bet: {
    label: "Game bet",
    short: "bet",
    badgeClass: "bg-red-500/10 border border-red-500/20 text-red-300",
    icon: <ArrowDownLeft className="h-4 w-4 text-red-300" />,
    amountClass: "text-red-400",
  },
  bonus: {
    label: "Bonus",
    short: "bonus",
    badgeClass: "bg-amber-500/10 border border-amber-500/20 text-amber-300",
    icon: <Gift className="h-4 w-4 text-amber-300" />,
    amountClass: "text-emerald-400",
  },
}

const fallbackMeta: Meta = {
  label: "Transaction",
  short: "txn",
  badgeClass: "bg-gray-500/10 border border-gray-500/20 text-gray-300",
  icon: <ArrowUpRight className="h-4 w-4 text-gray-300" />,
}

const fmtAmount = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString()}`
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

/** Make titles consistent regardless of how description/note was set */
const STRIPE_PURCHASE_DESC_PREFIX = "Token purchase (Stripe session:"
const STRIPE_PI_DESC_PREFIX = "Token purchase (Stripe PaymentIntent:"

function deriveTitle(t: Transaction) {
  const raw = (t as any).description || (t as any).note || ""
  const trimmed = raw.trim()

  if (t.type === "transfer_out") {
    // look for "to <name>" or "@<name>"
    const m = trimmed.match(/to\s+@?([\w.-]+)/i)
    if (m) return `Sent to @${m[1]}`
    return "Sent tokens"
  }

  if (t.type === "transfer_in") {
    const m = trimmed.match(/from\s+@?([\w.-]+)/i)
    if (m) return `Received from @${m[1]}`
    return "Received tokens"
  }

  if (t.type === "buy") return "Token pack purchase"
  if (
    t.type === "bonus" &&
    (trimmed.startsWith(STRIPE_PURCHASE_DESC_PREFIX) ||
      trimmed.startsWith(STRIPE_PI_DESC_PREFIX))
  )
    return "Token pack purchase"
  if (t.type === "win") return trimmed || "Game win"
  if (t.type === "bet") return trimmed || "Game bet"
  if (t.type === "bonus") return trimmed || "Bonus"
  return trimmed || "Transaction"
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Transaction History</CardTitle>
          <CardDescription className="text-gray-400">Your recent token activity</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white bg-transparent">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </CardHeader>

      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Start playing games to see your transaction history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => {
              const isStripePurchase =
                t.type === "bonus" &&
                ((desc) =>
                  desc.startsWith(STRIPE_PURCHASE_DESC_PREFIX) ||
                  desc.startsWith(STRIPE_PI_DESC_PREFIX))((t as any).description || "")
              const meta =
                isStripePurchase ? TYPE_META.buy : (TYPE_META[t.type] ?? fallbackMeta)
              const title = deriveTitle(t)
              const amountClass =
                meta.amountClass ?? (t.amount > 0 ? "text-emerald-400" : "text-red-400")

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gray-800/60">{meta.icon}</div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{title}</span>
                        <Badge className={meta.badgeClass}>{meta.short}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">{fmtWhen(t.created_at)}</div>
                    </div>
                  </div>

                  <div className={`text-sm font-semibold ${amountClass}`}>
                    {fmtAmount(t.amount)} <span className="text-gray-400 font-normal">tokens</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}