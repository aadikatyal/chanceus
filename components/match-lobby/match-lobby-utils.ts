import { getGameDisplayName } from "@/lib/games/game-visuals"

export type LobbyUser = {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  tokens?: number
  total_games_played?: number
  total_games_won?: number
}

export function lobbyDisplayName(user?: LobbyUser | null) {
  if (!user) return "Searching…"
  return user.display_name || user.username || "Player"
}

export function winRate(user?: LobbyUser | null) {
  const played = user?.total_games_played ?? 0
  const won = user?.total_games_won ?? 0
  if (played <= 0) return null
  return Math.round((won / played) * 100)
}

export function matchModeLabel(betAmount: number, tournament?: boolean) {
  if (tournament) return "Tournament"
  if (betAmount <= 0) return "Casual"
  return "Ranked"
}

export function gameRulesBlurb(gameName: string) {
  const n = getGameDisplayName(gameName).toLowerCase()
  if (n.includes("math")) return "Fastest correct answers win. No hints, no pauses."
  if (n.includes("row") || n.includes("four")) return "Connect four before your opponent. Standard grid rules."
  if (n.includes("trivia")) return "Answer more questions correctly before time runs out."
  return "Head-to-head skill. Winner takes the pot."
}
