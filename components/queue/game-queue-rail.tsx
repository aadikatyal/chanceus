"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PlayOpenLobbies from "@/components/play/play-open-lobbies"
import { createMatch } from "@/lib/game-actions"
import type { PlayLobbyMatch } from "@/components/play/play-types"

type GameQueueRailProps = {
  gameId: string
  waitingMatches: PlayLobbyMatch[]
  betAmount: number
  tokens: number
}

export default function GameQueueRail({ gameId, waitingMatches, betAmount, tokens }: GameQueueRailProps) {
  const router = useRouter()
  const [hosting, setHosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const amount = Math.max(1, betAmount)
  const canHost = tokens >= amount

  const hostLobby = async () => {
    if (!canHost || hosting) return
    setHosting(true)
    setError(null)
    const formData = new FormData()
    formData.set("gameId", gameId)
    formData.set("betAmount", String(amount))
    const result = await createMatch(null, formData)
    if (result?.error || !result?.matchId) {
      setError(result?.error || "Could not open a lobby")
      setHosting(false)
      return
    }
    router.push(`/games/match/${result.matchId}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <PlayOpenLobbies matches={waitingMatches} />
      <div className="chance-premium-card p-4 sm:p-[1.125rem]">
        <h2 className="chance-section-title">Need a host?</h2>
        <p className="chance-text-caption mt-1">Open a lobby at {amount} tokens and send the match link.</p>
        {error ? <p className="chance-text-caption mt-2 text-[var(--chance-no)]">{error}</p> : null}
        <button
          type="button"
          disabled={!canHost || hosting}
          onClick={() => void hostLobby()}
          className="chance-secondary-btn chance-focus-ring mt-3 inline-flex w-full justify-center py-2.5 text-sm disabled:opacity-50"
        >
          {hosting ? "Opening…" : "Open custom lobby"}
        </button>
      </div>
    </div>
  )
}
