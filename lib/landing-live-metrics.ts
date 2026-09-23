/** Real platform counts for the public landing — never inflated. */
export type LandingLiveMetrics = {
  /** Hero + platform record (same three everywhere) */
  gamesPlayed: number
  tokensInPlay: number
  moneyMadeUsd: number
  /** Realtime / mockup */
  playersOnline: number
  matchesLive: number
  inQueue: number
  openLobbies: number
  registeredPlayers: number
  openTournaments: number
  playersInArena: number
  tournamentsLive: number
  matchesDecided: number
  tokensEarned: number
}

export const EMPTY_LANDING_LIVE_METRICS: LandingLiveMetrics = {
  gamesPlayed: 0,
  tokensInPlay: 0,
  moneyMadeUsd: 0,
  playersOnline: 0,
  matchesLive: 0,
  inQueue: 0,
  openLobbies: 0,
  registeredPlayers: 0,
  openTournaments: 0,
  playersInArena: 0,
  tournamentsLive: 0,
  matchesDecided: 0,
  tokensEarned: 0,
}

export function buildLandingLiveMetrics(raw: {
  gamesPlayed: number
  tokensInPlay: number
  moneyMadeUsd: number
  playersOnline: number
  matchesLive: number
  inQueue: number
  openLobbies: number
  registeredPlayers: number
  openTournaments: number
  playersInArena: number
  tournamentsLive: number
  matchesDecided: number
  tokensEarned: number
}): LandingLiveMetrics {
  const clamp = (n: number) => Math.max(0, n)
  return {
    gamesPlayed: clamp(raw.gamesPlayed),
    tokensInPlay: clamp(raw.tokensInPlay),
    moneyMadeUsd: clamp(raw.moneyMadeUsd),
    playersOnline: clamp(raw.playersOnline),
    matchesLive: clamp(raw.matchesLive),
    inQueue: clamp(raw.inQueue),
    openLobbies: clamp(raw.openLobbies),
    registeredPlayers: clamp(raw.registeredPlayers),
    openTournaments: clamp(raw.openTournaments),
    playersInArena: clamp(raw.playersInArena),
    tournamentsLive: clamp(raw.tournamentsLive),
    matchesDecided: clamp(raw.matchesDecided),
    tokensEarned: clamp(raw.tokensEarned),
  }
}

export const LANDING_SHOWCASE_LABELS = {
  gamesPlayed: "Games played",
  tokensInPlay: "Tokens in play",
  moneyMade: "Money made",
} as const
