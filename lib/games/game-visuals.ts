/** Shared display names & artwork paths (Play lobby + Home featured tiles) */

export const gameThumbnails: Record<string, string> = {
  "Math Blitz": "/math-blitz.JPG",
  "Four in a Row": "/4-in-a-row.JPG",
  "4 In a Row": "/4-in-a-row.JPG",
  "Trivia Challenge": "/trivia-blitz.JPG",
}

export function getGameDisplayName(gameName: string) {
  if (gameName === "Connect 4") return "Four in a Row"
  return gameName
}

export function getGameThumbnail(gameName: string) {
  const displayName = getGameDisplayName(gameName)
  if (gameThumbnails[displayName]) return gameThumbnails[displayName]

  const n = gameName.toLowerCase()
  if (n.includes("math")) return gameThumbnails["Math Blitz"]
  if (n.includes("row") || n.includes("four") || n.includes("connect"))
    return gameThumbnails["4 In a Row"]
  if (n.includes("trivia")) return gameThumbnails["Trivia Challenge"]

  return "/placeholder.svg"
}
