import type { Tournament } from "@/lib/tournament-actions"
import type { Game } from "@/lib/supabase/client"
import type { GameLiveStats } from "@/lib/games/play-catalog"

export type PlayLobbyMatch = {
  id: string
  bet_amount: number
  created_at: string
  player1_id: string
  games: { name: string } | null
  player1: {
    username: string
    display_name?: string
    avatar_url?: string
  } | null
}

export type PlayMyQueue = {
  id: string
  game_id: string
  bet_amount: number
  match_type: string
  expires_at: string
  created_at: string
  games: { name: string } | null
}

export type FriendPlaying = {
  userId: string
  displayName: string
  username: string
  gameName: string
  matchId: string
}

export type PlayPagePayload = {
  games: Game[]
  statsByGame: Record<string, GameLiveStats>
  featuredGameId: string | null
  waitingMatches: PlayLobbyMatch[]
  myQueues: PlayMyQueue[]
  myActiveMatchCount: number
  matchmakingQueues: PlayMyQueue[] // initial shape compatible; realtime enriches
  tournaments: Tournament[]
  friendsPlaying: FriendPlaying[]
  totalLivePlayers: number
  totalInQueue: number
}
