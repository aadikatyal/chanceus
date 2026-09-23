"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { joinMatch } from "@/lib/game-actions"
import { EmptyState, SkeletonRows } from "@/components/dashboard/chance-craft"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import type { PlayLobbyMatch } from "@/components/play/play-types"

type PlayOpenLobbiesProps = {
  matches: PlayLobbyMatch[]
  loading?: boolean
}

export default function PlayOpenLobbies({ matches, loading }: PlayOpenLobbiesProps) {
  const router = useRouter()
  const [joining, setJoining] = useState<string | null>(null)

  const handleJoin = async (matchId: string) => {
    try {
      setJoining(matchId)
      const result = await joinMatch(matchId)
      if (result?.success && result?.matchId) {
        router.push(`/games/match/${result.matchId}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title">Open lobbies</h2>
        <span className="chance-text-caption">Join instantly</span>
      </div>

      {loading ? (
        <SkeletonRows rows={3} className="h-12" />
      ) : matches.length === 0 ? (
        <EmptyState className="py-8">
          <p className="chance-text-caption">
            No open lobbies right now.{" "}
            <Link href="/games" className="font-medium text-[var(--chance-brand)] hover:underline">
              Start matchmaking
            </Link>
          </p>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto -mx-0.5 px-0.5 [scrollbar-width:thin]">
          <table className="chance-table-rich w-full min-w-[480px] border-collapse text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--chance-border)] text-left">
                <th scope="col" className="pb-3 pr-3 font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Game
                </th>
                <th scope="col" className="pb-3 pr-3 font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Host
                </th>
                <th scope="col" className="pb-3 pr-3 font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Stake
                </th>
                <th scope="col" className="pb-3 text-right font-semibold uppercase tracking-[0.06em] text-[var(--chance-muted-fg)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const gameName = getGameDisplayName(match.games?.name ?? "Game")
                const host = match.player1?.display_name || match.player1?.username || "Player"
                return (
                  <tr key={match.id} className="chance-table-row border-b border-[var(--chance-border)] last:border-0">
                    <td className="py-3 pr-3 font-medium tracking-[-0.01em]">{gameName}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <ChancePlayerAvatar name={host} className="chance-table-opponent-avatar size-7 text-[0.625rem]" />
                        <span className="truncate">{host}</span>
                      </span>
                    </td>
                    <td className="chance-text-mono py-3 pr-3 tabular-nums">{match.bet_amount} tk</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="chance-hero-cta-primary chance-focus-ring inline-flex px-3 py-1.5 text-xs"
                        disabled={joining === match.id}
                        onClick={() => handleJoin(match.id)}
                      >
                        {joining === match.id ? "Joining…" : "Join"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
