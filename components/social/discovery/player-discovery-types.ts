export type DiscoveryPlayer = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  winRate: number
  rankLabel: string
  favoriteGame?: string
  winStreak: number
  isOnline: boolean
  inQueue: boolean
  mutualFriends: number
  lastPlayedAt?: string
  tokens?: number
  totalWins?: number
  friendState: "none" | "pending_out" | "pending_in" | "friends"
  requestId?: string
}

export type RecentOpponentRow = {
  userId: string
  displayName: string
  username: string
  gameName: string
  won: boolean
  at: string
  friendState: DiscoveryPlayer["friendState"]
  requestId?: string
}

export type RivalRow = {
  userId: string
  displayName: string
  username: string
  matchesPlayed: number
  wins: number
  losses: number
  tokenDelta: number
  currentStreak: number
  friendState: DiscoveryPlayer["friendState"]
  requestId?: string
}
