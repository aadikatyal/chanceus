"use client"

import Link from "next/link"
import OnlineUsersCount from "@/components/dashboard/online-users-count"
import UserRank from "@/components/dashboard/user-rank"

type DashboardSummaryProps = {
  tokens: number
  wins: number
  losses: number
  username: string
}

/** Competitive identity first; bankroll secondary. Uses token CSS fallbacks for layout. */
export default function DashboardSummary({ tokens, wins, losses, username }: DashboardSummaryProps) {
  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null

  return (
    <div className="chance-home-hero flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 flex-1">
        <p className="chance-text-label">Competitive standing</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="chance-text-caption mb-0.5">Rank</p>
            <p className="chance-text-mono text-3xl font-semibold tracking-tight text-[var(--chance-fg)] sm:text-4xl">
              <UserRank />
            </p>
          </div>
          <div>
            <p className="chance-text-caption mb-0.5">Record</p>
            <p className="chance-text-mono text-2xl font-semibold tabular-nums text-[var(--chance-fg)] sm:text-3xl">
              {wins}
              <span className="mx-1 font-medium text-[var(--chance-muted-fg)]">–</span>
              {losses}
            </p>
            {winRate !== null ? (
              <p className="chance-text-caption mt-0.5">{winRate}% win rate</p>
            ) : (
              <p className="chance-text-caption mt-0.5">No rated games yet</p>
            )}
          </div>
        </div>
        <p className="chance-text-caption mt-3">
          <span className="text-[var(--chance-muted-fg)]">Playing as </span>
          <span className="font-medium text-[var(--chance-fg)]">{username}</span>
          <span className="text-[var(--chance-muted-fg)]"> · Online now </span>
          <span className="chance-text-mono font-medium text-[var(--chance-fg)]">
            <OnlineUsersCount />
          </span>
        </p>
      </div>

      <div className="chance-home-actions flex w-full flex-col gap-3 sm:w-auto sm:min-w-[14rem] lg:items-stretch">
        <Link href="/games" className="chance-btn-primary">
          Find match
        </Link>
        <Link href="/wallet" className="chance-bankroll-link">
          <span className="chance-text-caption">Bankroll</span>
          <span className="chance-text-mono text-sm font-semibold tabular-nums">
            {tokens.toLocaleString()}
            <span className="ml-1 font-medium text-[var(--chance-muted-fg)]">tokens</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
