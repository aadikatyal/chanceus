import type { Bar, BarTriviaSession } from "@/lib/bar-actions"

export type VenueLiveEvent = {
  bar: Bar
  session: BarTriviaSession
  gameName: string
  playerCount: number
  seatsRemaining: number
  prizeLabel: string
  difficulty: "Casual" | "Competitive" | "Expert"
  themeTags: string[]
}

export type VenuePoster = {
  bar: Bar
  liveSessions: number
  nextLabel: string
  playerCount: number
  prizeLabel: string
  themeTags: string[]
  featuredGame?: string
}

export type VenueChampionRow = {
  id: string
  venueName: string
  playerName: string
  score: number
  gameName: string
}
