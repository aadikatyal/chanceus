/**
 * ChanceUS gem economy.
 * Gems are stored on users.tokens and mirrored to user_wallets.gems.
 * 1 standard entry = 10 gems. 1 rewarded ad = 10 gems.
 */

export const STANDARD_ENTRY_GEMS = 10
export const AD_REWARD_GEMS = 10
export const DAILY_AD_CAP = 10
export const MAX_FREE_DAILY_GEMS = DAILY_AD_CAP * AD_REWARD_GEMS
export const VIDEO_METER_INTERVAL_SECONDS = 300
export const VIDEO_METER_DEBIT_GEMS = 10

export type HeadsUpTierId = "tier1" | "tier2" | "tier3"

export type HeadsUpTier = {
  id: HeadsUpTierId
  name: string
  stake: number
  pot: number
  payout: number
  winnerTakesAll: true
}

export const HEADS_UP_TIERS: readonly HeadsUpTier[] = [
  { id: "tier1", name: "Base", stake: 10, pot: 20, payout: 20, winnerTakesAll: true },
  { id: "tier2", name: "Mid", stake: 20, pot: 40, payout: 40, winnerTakesAll: true },
  { id: "tier3", name: "High", stake: 50, pot: 100, payout: 100, winnerTakesAll: true },
] as const

export type BracketCode = "A" | "B" | "C"

export type TournamentBracket = {
  code: BracketCode
  name: string
  players: number
  entryStake: number
  pot: number
  /** Index 0 is 1st place. Trailing zeros are unpaid places. */
  payouts: readonly number[]
  paidPlaces: number
}

export const TOURNAMENT_BRACKETS: Record<BracketCode, TournamentBracket> = {
  A: {
    code: "A",
    name: "4-Player Quick Match",
    players: 4,
    entryStake: 10,
    pot: 40,
    payouts: [28, 12, 0, 0],
    paidPlaces: 2,
  },
  B: {
    code: "B",
    name: "5-Player Cash-Style Pool",
    players: 5,
    entryStake: 20,
    pot: 100,
    payouts: [60, 25, 15, 0, 0],
    paidPlaces: 3,
  },
  C: {
    code: "C",
    name: "8-Player Championship",
    players: 8,
    entryStake: 50,
    pot: 400,
    payouts: [240, 110, 50, 0, 0, 0, 0, 0],
    paidPlaces: 3,
  },
}

export function isBracketCode(value: unknown): value is BracketCode {
  return value === "A" || value === "B" || value === "C"
}

export function getHeadsUpTier(stake: number): HeadsUpTier | null {
  return HEADS_UP_TIERS.find((tier) => tier.stake === stake) ?? null
}

export function isHeadsUpStake(stake: number): boolean {
  return getHeadsUpTier(stake) !== null
}

export function headsUpPot(stake: number): number {
  return getHeadsUpTier(stake)?.pot ?? stake * 2
}

export function payoutForRank(bracket: TournamentBracket, rank: number): number {
  if (rank < 1) return 0
  return bracket.payouts[rank - 1] ?? 0
}

/** 00:00 UTC of the current day. */
export function utcDayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function needsUtcDailyReset(lastResetAt: string | null | undefined, now = new Date()): boolean {
  if (!lastResetAt) return true
  const last = new Date(lastResetAt)
  if (Number.isNaN(last.getTime())) return true
  return last.getTime() < utcDayStart(now).getTime()
}
