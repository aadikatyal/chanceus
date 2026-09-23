"use client"

import MatchmakingRealtime from "@/components/matchmaking-realtime"

type QueueRow = {
  id: string
  game_id: string
  bet_amount: number
  match_type: string
  expires_at: string
  created_at: string
  user_id?: string
  games: { name: string }
  users: {
    username: string
    display_name?: string
    avatar_url?: string
  }
}

type PlayMatchmakingPanelProps = {
  initialQueues: QueueRow[]
  currentUserId: string
}

export default function PlayMatchmakingPanel({ initialQueues, currentUserId }: PlayMatchmakingPanelProps) {
  return (
    <div className="chance-premium-card p-4 sm:p-[1.125rem]">
      <div className="chance-rail-card-head">
        <h2 className="chance-section-title">Players searching</h2>
        <span className="chance-play-live-badge">
          <span className="chance-play-live-dot" aria-hidden />
          Live
        </span>
      </div>
      <MatchmakingRealtime initialQueues={initialQueues} currentUserId={currentUserId} variant="competitive" />
    </div>
  )
}
