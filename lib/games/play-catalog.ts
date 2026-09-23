import type { Game } from "@/lib/supabase/client"
import { getGameDisplayName } from "@/lib/games/game-visuals"

export type PlayCategoryId = "all" | "strategy" | "puzzle" | "trivia" | "quick"

export const PLAY_CATEGORIES: { id: PlayCategoryId; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "strategy", label: "Strategy" },
  { id: "puzzle", label: "Puzzle & speed" },
  { id: "trivia", label: "Trivia" },
  { id: "quick", label: "Quick match" },
]

export function getPlayCategory(gameName: string): PlayCategoryId {
  const n = gameName.toLowerCase()
  if (n.includes("trivia")) return "trivia"
  if (n.includes("row") || n.includes("four") || n.includes("connect")) return "strategy"
  if (n.includes("math")) return "puzzle"
  return "quick"
}

export type GameLiveStats = {
  gameId: string
  inQueue: number
  liveMatches: number
  waitingLobbies: number
  playersLive: number
  estQueueSec: number | null
}

export function buildGameLiveStats(
  gameIds: string[],
  queueByGame: Record<string, number>,
  matchRows: { game_id: string; status: string }[]
): Record<string, GameLiveStats> {
  const out: Record<string, GameLiveStats> = {}

  for (const id of gameIds) {
    const rows = matchRows.filter((m) => m.game_id === id)
    const inProgress = rows.filter((m) => m.status === "in_progress").length
    const waiting = rows.filter((m) => m.status === "waiting").length
    const inQueue = queueByGame[id] ?? 0
    const playersLive = inProgress * 2 + inQueue + waiting

    let estQueueSec: number | null = null
    if (inQueue > 0) estQueueSec = Math.max(15, 90 - inQueue * 12)
    else if (waiting > 0) estQueueSec = 25
    else if (playersLive > 0) estQueueSec = 120

    out[id] = {
      gameId: id,
      inQueue,
      liveMatches: inProgress,
      waitingLobbies: waiting,
      playersLive,
      estQueueSec,
    }
  }

  return out
}

export function formatQueueEstimate(seconds: number | null) {
  if (seconds === null) return "Low activity"
  if (seconds < 60) return `< ${Math.max(15, seconds)}s`
  const m = Math.ceil(seconds / 60)
  return `~${m} min`
}

export function pickFeaturedGameId(games: Game[], stats: Record<string, GameLiveStats>) {
  if (games.length === 0) return null
  let best = games[0].id
  let bestScore = -1
  for (const g of games) {
    const s = stats[g.id]
    const score = (s?.playersLive ?? 0) * 3 + (s?.inQueue ?? 0) * 5 + (s?.liveMatches ?? 0) * 2
    if (score > bestScore) {
      bestScore = score
      best = g.id
    }
  }
  return best
}

export function filterPlayGames(
  games: Game[],
  query: string,
  category: PlayCategoryId
) {
  const q = query.trim().toLowerCase()
  return games.filter((game) => {
    const display = getGameDisplayName(game.name).toLowerCase()
    const desc = (game.description ?? "").toLowerCase()
    const matchesQuery = !q || display.includes(q) || desc.includes(q)
    const cat = getPlayCategory(game.name)
    const matchesCategory =
      category === "all" || cat === category || (category === "quick" && cat === "quick")
    return matchesQuery && matchesCategory
  })
}
