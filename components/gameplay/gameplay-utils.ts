export type GameplayPhase =
  | "loading"
  | "countdown"
  | "your-turn"
  | "opponent-turn"
  | "simultaneous"
  | "waiting-opponent"
  | "live"
  | "victory"
  | "defeat"
  | "draw"
  | "network-error"
  | "network-degraded"
  | "timeout"

export type ScoreLine = {
  you: string
  opponent: string
  label: string
}

export function displayName(user?: { display_name?: string | null; username?: string } | null) {
  if (!user) return "Opponent"
  return user.display_name || user.username || "Player"
}

export function extractScores(
  gameData: Record<string, unknown> | null | undefined,
  isPlayer1: boolean
): ScoreLine | null {
  if (!gameData) return null
  const p1 = gameData.player1Score ?? gameData.player1_score ?? gameData.p1Score
  const p2 = gameData.player2Score ?? gameData.player2_score ?? gameData.p2Score
  if (p1 === undefined && p2 === undefined) return null
  const you = isPlayer1 ? p1 : p2
  const opp = isPlayer1 ? p2 : p1
  return {
    you: you !== undefined ? String(you) : "—",
    opponent: opp !== undefined ? String(opp) : "—",
    label: "Score",
  }
}

export function resolveGameplayPhase(input: {
  matchStatus: string
  gameStateStatus: string
  isMyTurn: boolean
  hasOpponent: boolean
  winnerId: string | null
  currentUserId: string
  player1Id: string
  error: string | null
  isConnected: boolean
  countdown: number | null
  gameName?: string
}): GameplayPhase {
  const {
    matchStatus,
    gameStateStatus,
    isMyTurn,
    hasOpponent,
    winnerId,
    currentUserId,
    player1Id,
    error,
    isConnected,
    countdown,
    gameName,
  } = input

  if (error) return "network-error"
  if (!isConnected && matchStatus === "in_progress") return "network-degraded"

  if (matchStatus === "completed" || gameStateStatus === "completed") {
    if (!winnerId) return "draw"
    return winnerId === currentUserId ? "victory" : "defeat"
  }

  if (gameStateStatus === "countdown" || countdown !== null) return "countdown"

  if (!hasOpponent) return "waiting-opponent"

  const simultaneous = (gameName ?? "").toLowerCase().includes("math")
  if (gameStateStatus === "playing" || matchStatus === "in_progress") {
    if (simultaneous) return "simultaneous"
    return isMyTurn ? "your-turn" : "opponent-turn"
  }

  if (matchStatus === "in_progress") return "live"
  return "loading"
}

/** Card shell for in-match embed vs legacy full-page game UI. */
export function gameEmbedSurfaceClass(compact?: boolean, extra = "") {
  const base = compact
    ? "chance-game-embed chance-premium-card w-full max-w-3xl mx-auto border border-[var(--chance-border)] bg-transparent shadow-none"
    : "w-full max-w-4xl mx-auto bg-black border-gray-800"
  return extra ? `${base} ${extra}` : base
}

export function phaseLabel(phase: GameplayPhase) {
  switch (phase) {
    case "your-turn":
      return "Your turn"
    case "opponent-turn":
      return "Opponent's turn"
    case "simultaneous":
      return "Live — both playing"
    case "countdown":
      return "Starting"
    case "waiting-opponent":
      return "Waiting for opponent"
    case "victory":
      return "Victory"
    case "defeat":
      return "Defeat"
    case "draw":
      return "Draw"
    case "network-degraded":
      return "Syncing…"
    case "network-error":
      return "Connection issue"
    case "timeout":
      return "Time expired"
    default:
      return "Live"
  }
}

