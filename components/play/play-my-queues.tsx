"use client"

import { useState } from "react"
import Link from "next/link"
import { cancelMatchmakingQueue } from "@/lib/matchmaking-actions"
import { EmptyState } from "@/components/dashboard/chance-craft"
import { getGameDisplayName } from "@/lib/games/game-visuals"
import type { PlayMyQueue } from "@/components/play/play-types"

type PlayMyQueuesProps = {
  queues: PlayMyQueue[]
}

function queueWaitLabel(createdAt: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (sec < 60) return `${sec}s in queue`
  return `${Math.floor(sec / 60)}m ${sec % 60}s in queue`
}

export default function PlayMyQueues({ queues }: PlayMyQueuesProps) {
  const [cancelling, setCancelling] = useState<string | null>(null)

  if (queues.length === 0) {
    return (
      <div className="chance-premium-card p-4 sm:p-[1.125rem]">
        <div className="chance-rail-card-head">
          <h2 className="chance-section-title">Your queue</h2>
        </div>
        <EmptyState className="py-6">
          <p className="chance-text-caption">Not searching yet. Pick a game and hit Queue.</p>
        </EmptyState>
      </div>
    )
  }

  const handleCancel = async (id: string) => {
    setCancelling(id)
    try {
      const result = await cancelMatchmakingQueue(id)
      if (result.success) window.location.reload()
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title">Your queue</h2>
        <span className="chance-play-live-badge">
          <span className="chance-play-live-dot" aria-hidden />
          Searching
        </span>
      </div>
      <ul className="space-y-2">
        {queues.map((queue) => (
          <li key={queue.id} className="chance-play-queue-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-[-0.01em]">
                {getGameDisplayName(queue.games?.name ?? "Game")}
              </p>
              <p className="chance-text-caption">{queueWaitLabel(queue.created_at)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Link href={`/games/${queue.game_id}`} className="chance-link-subtle text-xs">
                View
              </Link>
              <button
                type="button"
                className="chance-text-caption text-[var(--chance-no)] hover:underline"
                disabled={cancelling === queue.id}
                onClick={() => handleCancel(queue.id)}
              >
                Leave
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
