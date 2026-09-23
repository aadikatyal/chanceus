"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Coins, Clock, Users, Zap } from "lucide-react"
import type { Game } from "@/lib/supabase/client"
import MatchmakingInterface from "@/components/games/matchmaking-interface"
import { createMatch } from "@/lib/game-actions"
import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"
import { formatQueueEstimate, type GameLiveStats } from "@/lib/games/play-catalog"

type GameQueueHubProps = {
  game: Game
  userId: string
  tokens: number
  stats: GameLiveStats
  queueCount: number
  openLobbies: number
}

type StakeOption = {
  id: string
  label: string
  matchType: "free" | "tokens"
  betAmount: number
}

function buildStakes(game: Game): StakeOption[] {
  const min = game.min_bet ?? 10
  const max = game.max_bet ?? 500
  const mid = Math.min(max, Math.max(min, Math.round((min + max) / 2 / 5) * 5))
  const stakes = [...new Set([min, mid, max])].map((amount) => ({
    id: `tokens-${amount}`,
    label: `${amount} tokens`,
    matchType: "tokens" as const,
    betAmount: amount,
  }))
  return [
    { id: "free", label: "Free play", matchType: "free", betAmount: 0 },
    ...stakes,
  ]
}

export default function GameQueueHub({
  game,
  userId,
  tokens,
  stats,
  queueCount,
  openLobbies,
}: GameQueueHubProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const displayName = getGameDisplayName(game.name)
  const thumb = getGameThumbnail(game.name)
  const stakes = useMemo(() => buildStakes(game), [game])

  const [selectedStakeId, setSelectedStakeId] = useState(stakes[1]?.id ?? stakes[0]?.id ?? "free")
  const [inQueue, setInQueue] = useState(false)
  const [hosting, setHosting] = useState(false)
  const [hostError, setHostError] = useState<string | null>(null)

  const selected = stakes.find((s) => s.id === selectedStakeId) ?? stakes[0]

  useEffect(() => {
    const tier = searchParams.get("tier")
    if (tier === "free") setSelectedStakeId("free")
    if (tier === "tokens" && stakes[1]) setSelectedStakeId(stakes[1].id)
  }, [searchParams, stakes])

  const hostAmount = selected.matchType === "free" ? 0 : selected.betAmount
  const canHost = selected.matchType === "free" || tokens >= hostAmount
  const canAfford =
    selected.matchType === "free" || tokens >= selected.betAmount

  const hostLobby = async () => {
    if (!canHost || hosting) return
    setHosting(true)
    setHostError(null)
    const formData = new FormData()
    formData.set("gameId", game.id)
    formData.set("betAmount", String(hostAmount))
    const result = await createMatch(null, formData)
    if (result?.error || !result?.matchId) {
      setHostError(result?.error || "Could not open a lobby")
      setHosting(false)
      return
    }
    router.push(`/games/match/${result.matchId}`)
  }

  return (
    <div className="chance-home-feed mx-auto w-full max-w-none">
      <Link
        href="/games"
        className="chance-link-arrow chance-focus-ring mb-4 inline-flex items-center gap-1 rounded-sm text-sm"
      >
        <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />
        Back to Play
      </Link>

      <section className="chance-play-spotlight chance-queue-spotlight">
        <div className="chance-play-spotlight-art">
          <Image src={thumb} alt="" fill className="object-cover" sizes="(max-width: 900px) 100vw, 40vw" priority />
          <div className="chance-play-spotlight-scrim" aria-hidden />
        </div>
        <div className="chance-play-spotlight-body">
          <p className="chance-hero-kicker">
            <span className="size-1.5 rounded-full bg-[var(--chance-brand)] shadow-[0_0_8px_var(--chance-brand)]" aria-hidden />
            Ranked queue
          </p>
          <h1 className="chance-play-spotlight-title">{displayName}</h1>
          <p className="mt-2 max-w-lg text-[0.9375rem] leading-[1.55] tracking-[-0.01em] text-[var(--chance-muted-fg)]">
            {game.description}
          </p>
          <dl className="mt-4 flex flex-wrap gap-2">
            <div className="chance-play-stat-pill">
              <Users className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{stats.playersLive}</span> live
            </div>
            <div className="chance-play-stat-pill">
              <Zap className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              <span className="chance-text-mono font-semibold tabular-nums">{queueCount}</span> searching
            </div>
            <div className="chance-play-stat-pill">
              <Clock className="size-3.5 stroke-[1.75] text-[var(--chance-brand)]" aria-hidden />
              Est. {formatQueueEstimate(stats.estQueueSec)}
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="chance-premium-card p-5 sm:p-6">
          {!inQueue ? (
            <>
              <h2 className="chance-section-title">Choose stake</h2>
              <p className="chance-text-caption mt-1">
                Same pool as everyone at this stake — first live opponent wins the match.
              </p>

              <div className="chance-play-categories mt-4" role="listbox" aria-label="Stake amount">
                {stakes.map((stake) => {
                  const active = stake.id === selectedStakeId
                  const affordable = stake.matchType === "free" || tokens >= stake.betAmount
                  return (
                    <button
                      key={stake.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={!affordable}
                      onClick={() => setSelectedStakeId(stake.id)}
                      className={`chance-play-category-pill chance-focus-ring ${active ? "chance-play-category-pill--active" : ""} ${!affordable ? "opacity-45" : ""}`}
                    >
                      {stake.label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-[var(--chance-radius-md)] border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] px-3 py-2.5 text-sm">
                <Coins className="size-4 shrink-0 text-[var(--chance-brand)]" aria-hidden />
                <span className="text-[var(--chance-muted-fg)]">Balance</span>
                <span className="chance-text-mono ml-auto font-semibold tabular-nums">{tokens.toLocaleString()}</span>
              </div>

              {!canAfford ? (
                <p className="chance-text-caption mt-3 text-[var(--chance-no)]">
                  Need {selected.betAmount} tokens for this stake.{" "}
                  <Link href="/wallet" className="font-medium text-[var(--chance-brand)] hover:underline">
                    Add tokens
                  </Link>
                </p>
              ) : null}
              {hostError ? <p className="chance-text-caption mt-3 text-[var(--chance-no)]">{hostError}</p> : null}

              <div className="chance-hero-cta-row mt-6">
                <button
                  type="button"
                  className="chance-hero-cta-primary chance-focus-ring disabled:opacity-50"
                  disabled={!canAfford}
                  onClick={() => setInQueue(true)}
                >
                  Enter queue
                </button>
                <button
                  type="button"
                  className="chance-hero-cta-ghost chance-focus-ring disabled:opacity-50"
                  disabled={!canHost || hosting}
                  onClick={() => void hostLobby()}
                >
                  {hosting ? "Opening…" : "Custom lobby"}
                </button>
              </div>
            </>
          ) : (
            <div className="chance-queue-matchmaking">
              <MatchmakingInterface
                variant="competitive"
                gameId={game.id}
                currentUserId={userId}
                matchType={selected.matchType}
                betAmount={selected.betAmount}
                autoStart
                onMatchFound={(matchId) => router.push(`/games/match/${matchId}`)}
                onCancel={() => setInQueue(false)}
              />
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="chance-premium-card p-4 sm:p-[1.125rem]">
            <h2 className="chance-section-title">Before you queue</h2>
            <ul className="mt-3 space-y-2 text-[0.8125rem] leading-relaxed text-[var(--chance-muted-fg)]">
              <li>Live pairing for up to 3 minutes</li>
              <li>Opponent found → you go straight to the match lobby</li>
              <li>{openLobbies} open {openLobbies === 1 ? "lobby" : "lobbies"} you can join instead</li>
            </ul>
          </div>
          <div className="chance-premium-card p-4 sm:p-[1.125rem]">
            <h2 className="chance-section-title">Practice</h2>
            <p className="chance-text-caption mt-1">Warm up solo — no tokens on the line.</p>
            <Link
              href={`/games/${game.id}/play`}
              className="chance-secondary-btn chance-focus-ring mt-3 inline-flex w-full justify-center py-2.5 text-sm"
            >
              Solo practice
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
