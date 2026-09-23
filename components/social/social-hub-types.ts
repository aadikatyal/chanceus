export type FriendPresenceStatus =
  | "offline"
  | "idle"
  | "away"
  | "searching"
  | "in_match"
  | "in_tournament"
  | "spectating"
  | "in_voice"

export type SocialFriend = {
  id: string
  displayName: string
  username: string
  isOnline: boolean
  status: FriendPresenceStatus
  statusDetail?: string
  matchId?: string
  favoriteGame?: string
  winRate?: number
  winStreak?: number
}

export type PulseKind =
  | "tournament_open"
  | "tournament_live"
  | "friend_win"
  | "friend_queue"
  | "streak"
  | "announcement"
  | "match_live"
  | "leaderboard"

export type PulseItem = {
  id: string
  kind: PulseKind
  title: string
  subtitle: string
  href?: string
  at: string
}

export type LfmLane = {
  gameName: string
  gameId?: string
  searching: number
  avgStake: number
  estimatedWaitSec: number
}

export type LfmPlayer = {
  id: string
  displayName: string
  username: string
  gameName: string
  betAmount: number
}

export type DmPreview = {
  userId: string
  displayName: string
  username: string
  preview: string
  at: string
  unread: number
  isOnline: boolean
}

export type RecentOpponent = {
  userId: string
  displayName: string
  username: string
  gameName: string
  won: boolean
  at: string
}

export type SuggestedUser = {
  id: string
  displayName: string
  username: string
  winRate: number
}

export type TournamentPulse = {
  id: string
  name: string
  status: string
  gameName: string
}

export type SocialLiveMatch = {
  id: string
  gameName: string
  player1: string
  player2: string
  bet: number
  startedAt: string | null
}
