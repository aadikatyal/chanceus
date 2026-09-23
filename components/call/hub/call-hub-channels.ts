import type { CallGameId } from "@/lib/call-constants"

export type CallHubRoom = {
  id: string
  roomCode: string
  name: string
  game: CallGameId
  tag: string
  isPublic: boolean
  voiceRequired?: boolean
}

/** Persistent community lounges — shared room codes (presentation routing only) */
export const CALL_FEATURED_ROOMS: CallHubRoom[] = [
  { id: "high-stakes", roomCode: "STAKES", name: "High Stakes Grind", game: "connect-four", tag: "Ranked", isPublic: true, voiceRequired: true },
  { id: "trivia-night", roomCode: "TRIVIA", name: "Trivia Night", game: "trivia", tag: "Community", isPublic: true },
  { id: "math-blitz", roomCode: "BLITZ1", name: "Math Blitz", game: "math-blitz", tag: "Quick queue", isPublic: true },
  { id: "casual", roomCode: "CASUAL", name: "Casual Lounge", game: "connect-four", tag: "Chill", isPublic: true },
]

export const CALL_VOICE_CHANNELS: CallHubRoom[] = [
  { id: "vc-ranked", roomCode: "RANKED", name: "Ranked Lounge", game: "connect-four", tag: "Voice", isPublic: true, voiceRequired: true },
  { id: "vc-casual", roomCode: "CASUL1", name: "Casual", game: "connect-four", tag: "Open", isPublic: true },
  { id: "vc-tourney", roomCode: "TRNY01", name: "Tournament Discussion", game: "trivia", tag: "Events", isPublic: true },
  { id: "vc-trivia", roomCode: "TRIVCH", name: "Trivia", game: "trivia", tag: "Theme", isPublic: true },
  { id: "vc-strat", roomCode: "STRAT1", name: "Strategy", game: "math-blitz", tag: "Coaching", isPublic: true },
]
