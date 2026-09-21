export const CALL_GAMES = [
  {
    id: "connect-four",
    gameId: "69bf26d2-110b-40d9-b20a-d5cfab14d133",
    name: "Four in a Row",
    description: "Classic strategy game. Get four in a row to win!",
    color: "from-yellow-500 to-yellow-600",
  },
  {
    id: "math-blitz",
    gameId: "d0c5fda9-ec91-46b4-be62-cba48b398168",
    name: "Math Blitz",
    description: "Lightning-fast arithmetic challenges. Solve math problems quickly to win!",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    id: "trivia",
    gameId: "e03ee060-b913-4795-9149-54660e2e2eac",
    name: "Trivia Challenge",
    description: "Test your knowledge across various categories!",
    color: "from-purple-500 to-purple-600",
  },
] as const

export type CallGameId = (typeof CALL_GAMES)[number]["id"]

export function isCallGameId(value: string | null | undefined): value is CallGameId {
  return CALL_GAMES.some((game) => game.id === value)
}

export function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export function normalizeRoomCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
}
